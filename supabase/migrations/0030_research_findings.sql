-- Pipeline & Warehouse Pattern Research Assistant — see
-- docs/research-assistant/design.md for the full design. Schema for
-- curated findings about genuine architectural patterns across Snowflake,
-- Databricks, dbt, Spark, Qlik, Redshift, MS Fabric, and n8n — deliberately
-- application-owned (not a dbt materialization like the
-- github-activity-pipeline marts tables) because research_findings rows
-- get referenced by UUID from content_embeddings.source_id,
-- content_audit_log.entity_id, and posts.id — none of which can survive a
-- DROP TABLE ... CASCADE-per-run materialization strategy.

-- ---------- Source registry (config-driven; adding a source is a row, not a deploy) ----------

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  vendor text not null
    check (vendor in ('snowflake', 'databricks', 'dbt', 'spark', 'qlik', 'redshift', 'fabric', 'n8n')),
  name text not null,
  source_type text not null check (source_type in ('rss', 'github_releases', 'changelog_scrape', 'forum')),
  url text not null,
  scrape_config jsonb,               -- CSS selector etc., only used by changelog_scrape sources
  poll_cadence_minutes int not null default 360,
  enabled boolean not null default true,
  trust_score numeric not null default 0.5,   -- updated by the weekly feedback-loop query
  consecutive_failures int not null default 0,
  last_polled_at timestamptz,
  last_item_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Raw ingestion layer ----------

create table public.research_source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.research_sources(id) on delete cascade,
  external_id text not null,          -- feed guid / release tag / content hash — the actual dedup key
  title text,
  raw_url text,
  raw_content text,
  status text not null default 'pending'
    check (status in ('pending', 'rejected', 'summarized')),
  fetched_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index research_source_items_status_idx on public.research_source_items (status);

-- ---------- Curated findings (what everything downstream reads) ----------

-- Status is deliberately just three values: 'new' (awaiting review),
-- 'approved' (admin has vouched for it — immediately live at
-- /research/{slug}, no separate publish step, since a finding's content is
-- already-structured LLM output the admin is either accepting or
-- rejecting, not drafting), and 'discarded'. Whether a finding later gets
-- folded into a "Note of the week" digest post is tracked independently via
-- digest_post_id/digested_at below — a finding can be live on /research for
-- weeks before (or without ever) appearing in a digest, so that's not a
-- status value, it's a second, optional distribution event.
create table public.research_findings (
  id uuid primary key default gen_random_uuid(),
  vendor text not null
    check (vendor in ('snowflake', 'databricks', 'dbt', 'spark', 'qlik', 'redshift', 'fabric', 'n8n')),
  pattern_category text not null check (pattern_category in (
    'incremental_modeling', 'semantic_layer', 'orchestration', 'cost_optimization',
    'storage_format', 'query_engine', 'governance', 'other'
  )),
  slug text not null unique,          -- e.g. 'dbt-incremental-microbatch-materialization'
  title text not null,
  what_changed text not null,
  why_it_matters text not null,
  stack_components text[] not null default '{}',
  source_urls text[] not null default '{}',
  source_item_ids uuid[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'approved', 'discarded')),
  discarded_reason text check (discarded_reason in (
    'already_covered', 'too_marketing', 'too_niche', 'wrong_category', 'not_interesting'
  )),
  digest_post_id uuid references public.posts(id),  -- set once a weekly digest folds this in
  digested_at timestamptz,
  confidence numeric,
  found_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index research_findings_vendor_idx on public.research_findings (vendor, found_at desc);
create index research_findings_status_idx on public.research_findings (status, found_at desc);

-- ---------- Secondary free-tagging (separate from the fixed pattern_category enum) ----------

create table public.research_pattern_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null
);

create table public.research_finding_tags (
  finding_id uuid not null references public.research_findings(id) on delete cascade,
  tag_id uuid not null references public.research_pattern_tags(id) on delete cascade,
  primary key (finding_id, tag_id)
);

-- ---------- RLS ----------
-- research_sources and research_source_items stay admin-only, same shape as
-- content_audit_log — the pipeline repo writes them via a direct
-- service-role Postgres connection, never through PostgREST, so RLS on
-- those two never gates a real write path; it only matters for the (never
-- granted) case of an anon key touching them. research_findings is
-- different: /research reads it with the ordinary anon-scoped client the
-- same way build-log/page.tsx reads case_studies, so it needs a real public
-- policy, scoped to approved rows only — same "published or is_admin()"
-- shape case_studies already uses.

alter table public.research_sources enable row level security;
alter table public.research_source_items enable row level security;
alter table public.research_findings enable row level security;
alter table public.research_pattern_tags enable row level security;
alter table public.research_finding_tags enable row level security;

create policy "admin full access to research sources" on public.research_sources
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin full access to research source items" on public.research_source_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads approved research findings" on public.research_findings
  for select using (status = 'approved' or public.is_admin());
create policy "admin write access to research findings" on public.research_findings
  for insert with check (public.is_admin());
create policy "admin update access to research findings" on public.research_findings
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete access to research findings" on public.research_findings
  for delete using (public.is_admin());

create policy "admin full access to research pattern tags" on public.research_pattern_tags
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin full access to research finding tags" on public.research_finding_tags
  for all using (public.is_admin()) with check (public.is_admin());
