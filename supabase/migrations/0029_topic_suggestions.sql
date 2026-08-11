-- Public "vote on what I write next" list. Curated: raw chat_content_gaps
-- questions stay internal (admin-only, see chat_content_gaps); admin
-- promotes a gap into a clean public topic here. No public RLS policy on
-- either table — the public page and the vote endpoint both read/write
-- through the service-role client (same "curated aggregate over an
-- admin-only table" precedent /agent-activity uses for cron_runs). The
-- unique(topic_id, voter_id) constraint is the actual vote-dedup
-- mechanism, not RLS.
create table public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_gap_question text,
  status text not null default 'open' check (status in ('open', 'writing', 'published', 'closed')),
  created_at timestamptz not null default now()
);

create table public.topic_suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topic_suggestions(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (topic_id, voter_id)
);

alter table public.topic_suggestions enable row level security;
alter table public.topic_suggestion_votes enable row level security;

create policy "admin full access to topic suggestions" on public.topic_suggestions
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin full access to topic suggestion votes" on public.topic_suggestion_votes
  for all using (public.is_admin()) with check (public.is_admin());
