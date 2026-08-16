# Pipeline & Warehouse Pattern Research Assistant — design

Status: site-side integration built (schema, public /research section, admin
triage + source registry UI, RAG hook, MCP tool, digest cron) — not yet
deployed, not yet applied to the live database. The ingestion/classification
pipeline (a second repo) is not yet started. Branch:
`worktree-pipeline-research-assistant`.

Decisions since the first draft, made explicitly with the user rather than
assumed:

- **Findings get a real public surface**: `/research` (index, filterable by
  vendor) + `/research/{slug}` (detail), not just chat/MCP/digest-only. This
  changed the status model below — see §5 and §9.
- **The ingestion pipeline runs as a separate repo + GitHub Actions**, per
  the original recommendation — not yet created; see the note at the end of
  this doc.

## What this is

A system that watches Snowflake, Databricks, dbt, Spark, Qlik, Redshift,
MS Fabric, and n8n for genuine architectural/pattern news (not marketing), turns
survivors into structured, dated `research_findings` rows, and lets those
findings flow into three places you already have: the chat widget's RAG
index, the public MCP server, and the `posts` table (as build-log /
"Note of the week" drafts you approve like any other agent-drafted post).

## Why it's a second repo, not a folder in this one

`github-activity-pipeline` is the precedent: a separate repo, its own GitHub
Actions cron, dbt over raw/staging/marts schemas, writing into the *same*
Supabase Postgres instance this site already reads from
([pipeline-metrics.ts:16-24](src/lib/pipeline-metrics.ts)). Reasons to repeat
that shape rather than build ingestion into this Next.js app:

- **Runtime fit.** Ingestion + classification + summarization is bursty,
  occasionally slow (scraping, LLM calls with retries) work that doesn't
  belong on a Vercel serverless function with its execution-time ceiling.
  GitHub Actions on a cron has no such limit.
- **Blast radius.** A bug in a scraper or a runaway classification loop
  should not be able to take down the site's build or its deploy pipeline.
  Two repos means two failure domains.
- **You already pay this cost once.** The op muscle for "separate repo,
  cron-triggered, writes to shared Postgres, exposes a health signal back
  to the site" already exists (`getPipelineWorkflowStatus()` in
  [agent-activity.ts:77-121](src/lib/agent-activity.ts)). Reusing it is
  cheaper than inventing an in-process job runner for this site.

Proposed name: `pipeline-research-agent`, same owner account, same shared
Supabase project. This worktree covers the **site-side integration**: schema
that lives in `public` (not a pipeline-owned schema — see §5), the MCP tool,
the RAG hook, the digest agent, and the editorial UI. The ingestion repo
itself is out of scope for this worktree but designed against below so the
interface between the two is settled before either side gets built.

---

## 1. Source registry

Config-driven table, not a code file, so adding a source is an `INSERT`:

```sql
create table research_sources (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,               -- 'snowflake' | 'databricks' | 'dbt' | 'spark' | 'qlik' | 'redshift' | 'fabric' | 'n8n'
  name text not null,                 -- 'Snowflake Engineering Blog'
  source_type text not null,          -- 'rss' | 'github_releases' | 'changelog_scrape' | 'forum'
  url text not null,
  poll_cadence_minutes int not null default 360,
  enabled boolean not null default true,
  trust_score numeric not null default 0.5,  -- see §10
  last_polled_at timestamptz,
  last_item_at timestamptz,
  created_at timestamptz not null default now()
);
```

`source_type` is the only thing that requires code — it selects which
ingestion agent (§2) handles the row. Everything else (which URL, how often,
on/off) is data. Seed ~3-5 sources per vendor at launch:

| vendor | changelog/release | engineering blog | community |
|---|---|---|---|
| Snowflake | docs release notes RSS | Snowflake Engineering Medium | Snowflake Forums (scrape) |
| Databricks | GitHub releases (`databricks/runtime`) | Databricks Blog RSS | — |
| dbt | GitHub releases (`dbt-labs/dbt-core`) | dbt Developer Blog RSS | dbt Slack digest (manual export, low cadence) |
| Spark | GitHub releases (`apache/spark`) | — | — |
| Qlik | Qlik Community release notes (scrape) | Qlik Engineering Blog RSS | — |
| Redshift | AWS "What's New" RSS filtered to Redshift | AWS Big Data Blog RSS | — |
| MS Fabric | MS Fabric blog RSS | Fabric release plan (scrape, structured HTML) | — |
| n8n | GitHub releases (`n8n-io/n8n`) | n8n Blog RSS | n8n Community forum (Discourse RSS) |

n8n is a different animal from the other seven — it's workflow orchestration,
not a warehouse or transform engine — but it earns a place here because it's
increasingly the glue *between* those systems (triggering dbt runs, moving
data between Snowflake/Redshift and everything else), and its release notes
regularly touch the `orchestration` pattern category directly. Its
`pattern_category` mix will skew harder toward orchestration/governance than
the warehouse vendors' does — worth watching in the first month of data to
confirm it isn't mostly noise for this site's angle before investing more
sources in it.

**Trade-off:** a registry table means the *fetch adapter* still has to
special-case per `source_type`, so this doesn't get you to zero-code for a
genuinely new source shape (e.g. a paid newsletter with no feed) — only for
"one more RSS feed" or "one more GitHub repo," which is the common case.
That's the right amount of genericity; a fully pluggable fetch-DSL would be
solving a problem you don't have at ~30-40 sources.

## 2. Ingestion agents

Three scoped fetchers, one process each, matching `source_type`:

- **`rss_poller`** — `feedparser`-equivalent, cadence = each source's
  `poll_cadence_minutes` (default 6h; vendor changelogs can go slower, e.g.
  24h, forums faster if used at all).
- **`github_releases_poller`** — GitHub REST `/repos/{owner}/{repo}/releases`
  since `last_item_at`, same auth pattern as
  [github-activity.ts:20-21](src/lib/github-activity.ts) (optional
  `GITHUB_TOKEN`, best-effort on failure — one dead source doesn't fail the
  run).
- **`changelog_scraper`** — fallback for sources with no clean feed (Qlik
  Community, MS Fabric release plan). Fetch HTML, extract via a per-source
  CSS selector stored in `research_sources.scrape_config jsonb`, diff
  against the last stored raw hash to detect "changed since last poll."
  This is the one that breaks when a vendor redesigns their docs site —
  treat scraper failures as a *source health* signal (bump a
  `consecutive_failures` counter, auto-disable after N, surface on an
  admin page) rather than a pipeline failure.

All three write into one raw table, never into `research_findings` directly:

```sql
create table research_source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources(id),
  external_id text not null,          -- feed guid / release tag / content hash
  title text,
  raw_url text,
  raw_content text,
  fetched_at timestamptz not null default now(),
  unique (source_id, external_id)
);
```

The `unique (source_id, external_id)` constraint is the entire "did I already
see this" check — cheaper and more reliable than content hashing at
ingestion time. Each poller runs as a separate scheduled job (GitHub Actions
matrix or separate workflow files, mirroring `pipeline.yml` /
`freshness-check.yml`'s split) so a slow scraper doesn't block RSS polling.

**Cadence trade-off:** polling every source every run is wasteful once you
have 25+ sources. Store `poll_cadence_minutes` per source and have the
scheduler run hourly but skip sources not yet due — same idea as
`overdue` in [cron-runs.ts:56-60](src/lib/cron-runs.ts), just applied
per-source instead of per-job.

## 3. Classification & filtering

One Claude call per new `research_source_items` row (or small batches),
producing a structured verdict — this is the genuine-pattern-vs-marketing
gate:

```
tags: { vendor, pattern_category, is_genuine_pattern: bool, confidence: 0-1 }
```

`pattern_category` is a fixed enum, not free text, so filtering/browsing
stays usable: `incremental_modeling | semantic_layer | orchestration |
cost_optimization | storage_format | query_engine | governance | other`.

The filter prompt should be *explicit about what to reject*, not just "is
this interesting" — vendor announcement posts are optimized to sound
interesting. Concretely: reject if the item's primary content is a
pricing/GA/availability announcement, a customer case study, an award, or a
partnership announcement, even if it mentions an architectural feature in
passing. Keep if it describes *how* something works, a benchmark
methodology, a migration/design trade-off, or a deprecation that changes how
people should build. Feed 5-10 hand-picked positive/negative examples in the
system prompt (few-shot) rather than trying to define this purely by rule —
this is exactly the kind of judgment call that benefits from examples over
taxonomy.

Store the verdict on the item rather than immediately deleting rejected
ones — keep them with `status = 'rejected'` for a window (see purge policy
below) so you can spot-check the filter's false-negative rate before trusting
it unattended.

**Deduplication across overlapping coverage** (e.g. dbt's own release notes
*and* a blog post covering the same release): dedupe at the
`research_findings` level, not the raw-item level, because two sources
describing the same underlying change often add distinct value (the
changelog gives you *what*, the blog gives you *why*). Do it with the
embedding you're already computing for RAG (§6): before inserting a new
finding, check cosine similarity against findings from the same vendor in
the last 14 days; above a threshold (start at 0.92 — deliberately tight,
tighter than the 0.3 relevance threshold in
[content-search.ts:31](src/lib/content-search.ts), since this is
same-item detection, not relevance), merge by appending the second source's
URL to the first finding's `source_urls` array instead of creating a new row.

**Dead end worth flagging:** the tempting shortcut is deduping on
title/URL-slug similarity (cheap, no LLM/embedding call). It fails constantly
in this domain because vendors reuse the same release-note title across a
changelog entry, a blog recap, and a GitHub release ("Snowflake 8.20
Release Notes" appears near-verbatim in three places with different bodies).
Embedding-based dedup on the summarized *content*, done after summarization
rather than before, is the version that actually holds up — which also means
dedup has to happen after §4, not before it, despite the more obvious
raw-item-level placement.

## 4. Summarization

Runs only on items that survived classification. Fixed structured output,
one Claude call per surviving item (batch isn't worth it — findings need
independent judgment, and batching would blur which source justifies which
claim):

```
VENDOR: <one of the eight>
PATTERN_CATEGORY: <enum from §3>
WHAT_CHANGED: <2-3 sentences, factual>
WHY_IT_MATTERS: <2-3 sentences, your angle: what this means for pipeline/warehouse design decisions>
STACK_COMPONENTS: <comma-separated: which parts of a typical stack this touches — ingestion, transform, storage, orchestration, serving, governance>
SOURCES: <urls, one per line>
```

Same delimited-sections format as `parseAgentDraft()`
([agent-draft.ts:20-26](src/lib/agent-draft.ts)) and for the identical
reason noted there: citation-bearing text breaks JSON escaping in ways
plain delimited text doesn't. Reuse that parser's shape rather than
inventing a second one — write a sibling `parseFindingDraft()` with the
same regex-per-field approach if the pipeline repo needs its own copy (it's
Python there, so it's a port, not a shared import, but keep the *format*
identical so a human reading either output recognizes it).

**Trade-off on "citable format":** resist adding inline citation markers
into `WHAT_CHANGED`/`WHY_IT_MATTERS` prose (like `[1]`) — it looks citable
but breaks the moment two findings get merged in dedup (§3) or excerpted
into a digest (§7). Keep citations as a flat `source_urls` array on the row
and render them separately at every consumption point (chat widget,
MCP tool, digest post) — same separation `content-search.ts` already uses
between chunk text and `url_path`.

## 5. Storage schema

This is the one piece of ingestion-repo territory this worktree should
actually own, because these tables get referenced by `content_embeddings`
and `content_audit_log`, both of which live here.

```sql
-- supabase/migrations/0030_research_findings.sql

create table research_sources ( ... );          -- §1
create table research_source_items ( ... );      -- §2

-- Status is deliberately three values, not five — see the "status model"
-- note below for why 'published'/'digested' from the first draft collapsed.
create table research_findings (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  pattern_category text not null,
  slug text not null unique,           -- e.g. 'dbt-incremental-microbatch-materialization'
  title text not null,                 -- short, human-facing; not the same as WHAT_CHANGED
  what_changed text not null,
  why_it_matters text not null,
  stack_components text[] not null default '{}',
  source_urls text[] not null default '{}',
  source_item_ids uuid[] not null default '{}',   -- provenance back to research_source_items
  status text not null default 'new'
    check (status in ('new', 'approved', 'discarded')),
  discarded_reason text,               -- closed taxonomy, not freeform — feeds §10
  digest_post_id uuid references posts(id),  -- set once a weekly digest folds this in
  digested_at timestamptz,
  confidence numeric,                  -- classifier's confidence, kept for §10 calibration
  found_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text                     -- the reviewing admin's email
);
```

**Status model, revised from the first draft:** once findings got a real
public surface (`/research`), the original five-value status
(`new/approved/discarded/digested/published`) stopped making sense —
"approved" and "published" would have meant the same thing (there's no
separate draft/editing step for a finding's *content*; the admin is either
vouching for already-structured LLM output or rejecting it), and "digested"
conflated the finding's own visibility with a second, independent event —
whether a weekly digest post happened to fold it in. So: **`status` is now
just `new → approved | discarded`**, where `approved` means live at
`/research/{slug}` immediately, no separate publish step. Digest inclusion
is tracked orthogonally via `digest_post_id`/`digested_at`, set later by the
digest cron (§7) — a finding can sit approved and public for weeks before
(or without ever) appearing in a "Note of the week" post. See §9 for the
updated state diagram.

```sql

create table research_pattern_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null
);
-- finding.pattern_category stays a plain enum-checked column, not a join to
-- this table — research_pattern_tags exists for *secondary*, free-tagging
-- (e.g. "vector-search", "streaming") layered on top, many-to-many:

create table research_finding_tags (
  finding_id uuid not null references research_findings(id) on delete cascade,
  tag_id uuid not null references research_pattern_tags(id) on delete cascade,
  primary key (finding_id, tag_id)
);

create index research_findings_vendor_idx on research_findings (vendor, found_at desc);
create index research_findings_status_idx on research_findings (status, found_at desc);
```

**The dead end worth writing about:** the obvious move, having just read
`pipeline-metrics.ts`'s comment about `github-activity-pipeline`, is to
mirror its `raw`/`staging`/`marts` dbt-materialized schema shape for
`research_findings` too. Don't. That pattern exists there specifically
because the site only ever *reads* aggregates through a `security definer`
function — nothing holds a foreign key into `marts.fct_commits` rows, so
dbt's `DROP TABLE ... CASCADE`-per-run materialization is harmless
(see the comment at
[pipeline-metrics.ts:16-24](src/lib/pipeline-metrics.ts)). `research_findings`
rows get referenced *by UUID* from three other tables the moment this
system goes live:

- `content_embeddings.source_id` (§6)
- `content_audit_log.entity_id` (§9)
- `posts.id` via `digest_post_id`, the reverse edge

A dbt materialization would regenerate those UUIDs on a schedule and
silently orphan every one of those references. `research_findings` has to
be application-owned data — plain upserts from the pipeline repo's
Postgres connection, keyed on something stable (e.g. a dedup key derived in
§3), never a `create or replace table` target. dbt is still useful *upstream*
of this table, purely for the raw→staging extraction/dedup SQL over
`research_source_items`, where ephemeral materialization is fine because
nothing outside the pipeline repo references those intermediate rows.

**RLS:** `research_sources`/`research_source_items` stay admin-only, same
shape as `content_audit_log` — the pipeline repo writes them via a direct
service-role Postgres connection, not PostgREST, so RLS there never gates a
real write path. `research_findings` is different, once `/research` is a
real public page: it needs an actual public policy, `status = 'approved' or
is_admin()`, the same "published or is_admin()" shape `case_studies`
already uses — the anon-scoped client `/research/page.tsx` calls through
(same pattern as `build-log/page.tsx` reading `case_studies`) depends on it.

## 6. Retrieval / RAG layer

Extend `reindexContentEmbeddings()`
([chat-index.ts:24-125](src/lib/chat-index.ts)) with a fifth source, gated
on `status = 'approved'` — same "only published rows get embedded" rule
already applied to `posts`/`case_studies`, now shipped as-is:

```ts
const { data: findings } = await supabase
  .from("research_findings")
  .select("id, slug, title, what_changed, why_it_matters")
  .eq("status", "approved");

for (const finding of findings ?? []) {
  const text = [finding.what_changed, finding.why_it_matters].join("\n\n");
  for (const chunk of chunkText(text)) {
    rows.push({
      source_type: "research_finding",
      source_id: finding.id,
      title: finding.title,
      url_path: `/research/${finding.slug}`,
      chunk_text: chunk,
      is_site_post: false,
    });
  }
}
```

This is additive to the existing full delete-and-rebuild
(`content_embeddings.delete().neq(...)` at
[chat-index.ts:105](src/lib/chat-index.ts)) — no schema change to
`content_embeddings` or `match_content_embeddings` needed, since
`source_type` is already a free-text discriminator column.

**Trade-off:** `reindexContentEmbeddings()` is a full rebuild, manually
triggered from `/admin/chat-index`. Once findings are flowing in
continuously, "manually re-index whenever you remember" means the chat
widget's answers lag actual findings by however long it's been since you
last hit reindex. Two options: (a) leave it manual and accept the lag —
consistent with how the rest of the site already treats indexing as an
editorial action, not a live pipeline; (b) call
`reindexContentEmbeddings()` from the digest cron (§7) after publishing,
so at minimum "just-digested" findings get indexed weekly. Recommend (b) —
it's a one-line addition to the digest route, and it means the RAG index is
never more than a week stale for findings without adding a new incremental-
indexing code path.

## 7. Digest generation

Shipped: a new site-side cron, `research-digest`
([cron/research-digest/route.ts](src/app/api/cron/research-digest/route.ts)),
structurally identical to `weekly-insight`
([cron/weekly-insight/route.ts](src/app/api/cron/weekly-insight/route.ts)):
same `CRON_SECRET` bearer check, same `recordCronRun()` bookkeeping. Added
to `vercel.json`'s `crons` array (Sundays 18:00 UTC, ahead of Monday's
weekly-insight) and to `CronJobName` in
[cron-runs.ts](src/lib/cron-runs.ts).

Unlike `weekly-insight` (which *generates* a short note from nothing), the
digest *drafts a post from data*
([research-digest.ts](src/lib/research-digest.ts)): pull `research_findings`
where `status = 'approved'`, `digested_at is null`, and `found_at` in the
last 7 days, hand the list to Claude with a system prompt asking for a
"Note of the week"-style synthesis in the site's existing voice — reuse the
same `TITLE:/EXCERPT:/TAGS:/BODY:` contract `parseAgentDraft()` expects, and
save via `saveAgentDraftPost()` exactly like `draftPostWithAgent()` does
([posts/actions.ts](src/app/admin/%28protected%29/posts/actions.ts)) —
**always unpublished**, landing in the normal `/admin/posts` review queue.
Returns `null` (not an error) when there's nothing new to digest, so a quiet
week doesn't manufacture an empty post.

On a successful draft, the folded-in findings get `digest_post_id` (the new
post's id) and `digested_at` set in the same call — no status change, since
`digested` isn't a status anymore (see §9's revised state machine).

**Voice-matching trade-off:** `weekly-insight.ts`'s system prompt is short
and strict ("one or two sentences, no markdown, no fabricated quotes") 
because the output is tiny. A digest post is 400-800 words synthesizing
5-15 findings — the failure mode isn't voice drift, it's the summary
reading like a bulleted vendor-changelog recap instead of your own
build-log voice. Mitigate by feeding 2-3 of your own recent `is_site_post`
build-log entries as style exemplars in the prompt (pull from `posts` the
same way `draftPostWithAgent()` pulls `existingTitles` to avoid repeats),
not just a description of the voice.

## 8. MCP exposure

Shipped: a new public tool, `search_pipeline_patterns`, registered in
[mcp/route.ts](src/app/api/mcp/route.ts) alongside `search_content`, gated
by its own `site_content` flag (`mcp_pipeline_patterns_enabled`) following
the exact pattern the other three public tools use.

**Why a new tool instead of routing findings through `search_content`:**
`search_content` is pure semantic search over `content_embeddings` chunks —
no structured filters. `search_pipeline_patterns` needs `vendor` and
`pattern_category` as first-class filters (a visitor asking "what's changed
in dbt's incremental models recently" wants a *filtered list*, not a
similarity-ranked chunk soup), plus a `since` date, which chunk-level
semantic search can't express cleanly.

The actual filter/re-rank logic lives in `searchPipelinePatterns()`
([research-findings.ts](src/lib/research-findings.ts)), not inline in the
route, so the REST/OpenAPI-documented description of this tool and the MCP
tool itself can't drift: with no `query`, it's a plain `research_findings`
query (`status = 'approved'`, optional `vendor`/`pattern_category`/`since`
filters, newest first). With a `query`, it embeds it, calls
`match_content_embeddings` for up to 40 candidates, filters to
`source_type = 'research_finding'`, dedupes by `source_id` keeping
similarity order, *then* fetches the matching `research_findings` rows and
applies the same structured filters — so a vendor/category filter combined
with a free-text query narrows an already-relevance-ranked set rather than
the other way around.

Every call logs via `logContentChange({ source: "mcp_client", action:
"mcp.search_pipeline_patterns", ... })`, same as the other three tools —
free provenance on `/agent-activity` with zero extra code.

## 9. Editorial control & audit trail

State machine lives entirely in `research_findings.status` (§5), revised
from the original five-value draft down to three: `new → approved |
discarded`. `approved` is both "the admin vouches for this" and "it's now
live at `/research/{slug}`" in one action — there's no separate publish
step, since `FindingReviewControls` (the Approve button in
`/admin/research-findings`) does both at once. Whether a digest post later
folds an approved finding in is a *separate*, optional event, tracked by
`digest_post_id`/`digested_at` rather than a fourth status value — a
finding can be live on `/research` for weeks before, or without ever, being
digested. Map each transition to the right logging surface — don't push
everything into `content_audit_log`, which gets purged after 7 days
(`purge-agent-logs` cron) and is meant for *content* changes visible on
`/agent-activity`, not ingestion internals:

| transition | where it's logged |
|---|---|
| raw item fetched | `research_source_items` row only (no audit log — this is ingestion volume, not a content event) |
| classified genuine / rejected | nowhere separate — the verdict *is* the row's existence (kept) or its `status='rejected'` marker (§3); LLM cost via `logAiUsage({ operation: "research_classify" })` |
| finding created (summarized) | `content_audit_log` insert, `source: "pipeline_research_agent"`, `action: "research_finding.create"` — this is the first point a human-visible artifact exists |
| admin approves (→ live on `/research`) | `approveFinding()` in [research-findings.ts](src/lib/research-findings.ts), logs `content_audit_log` with `action: "research_finding.approve"`, source `"admin_ui"` |
| admin discards, with a reason | `discardFinding()`, same file, `action: "research_finding.discard"`, source `"admin_ui"` |
| digest drafts a post | `content_audit_log` via `saveAgentDraftPost()`, same as any agent-drafted post, source `"pipeline_research_agent"`; the folded-in findings get `digest_post_id`/`digested_at` set in the same call |
| digest post published | already logged by the existing `savePost()` action |

Shipped: `"pipeline_research_agent"` is now in the `AuditSource` union and
`AUDIT_SOURCE_LABELS` in [audit-log.ts](src/lib/audit-log.ts), and in the
enums documented in [openapi-spec.ts](src/lib/openapi-spec.ts) and
[audit-logs/route.ts](src/app/api/admin/audit-logs/route.ts).

**Dead end worth flagging:** reusing the existing `"research_agent"` source
value instead of adding a new one is the tempting shortcut — it's already
in the enum and the name matches. Don't: that value currently means
"admin typed a topic, one Claude-with-web-search call happened, right now,
because a human asked" (`draftPostWithAgent()`). Overloading it with "an
autonomous pipeline classified this over the last 6 hours across 30 sources"
would make `/agent-activity`'s per-source "last active" and "total writes"
stats
([agent-activity.ts:47-68](src/lib/agent-activity.ts)) meaningless for
both — you'd lose the ability to tell "I asked for a post about X" from
"the pipeline found something," which is exactly the distinction that
audit trail exists to preserve.

Shipped: `/admin/research-findings`, structurally a copy of the `topics` /
`contact-messages` triage pattern
([admin/(protected)/topics](src/app/admin/%28protected%29/topics)):
`status.ts` (discard-reason labels — client-safe constants, kept out of
`actions.ts` for the same reason `topics/status.ts` is separate, see its own
comment), `finding-review-controls.tsx` (an Approve button + a
discard-reason select, not a single status dropdown, since discarding
always needs a reason attached), `actions.ts`, `page.tsx` listing pending
findings oldest-first followed by a recently-reviewed reference list. This
is the human review gate the whole system hangs off — nothing reaches
`content_embeddings`, the MCP tool, or `/research` without passing through
it. A second admin page, `/admin/research-sources`, was added beyond the
original plan — full CRUD over the §1 registry table, since seeding real
vendor changelog/RSS URLs into a migration would have meant guessing at
URLs rather than the user supplying the real ones.

## 10. Feedback loop

No ML infra, just SQL over data you're already writing. Two mechanisms:

**Per-source trust score.** A scheduled query (weekly, could ride along
inside the `research-digest` cron or a separate lightweight one) computes,
per `research_sources.id`:

```sql
update research_sources s set trust_score = sub.rate
from (
  select source_id,
    count(*) filter (where rf.status = 'approved')::numeric
      / nullif(count(*), 0) as rate
  from research_findings rf
  join unnest(rf.source_item_ids) as item_id on true
  join research_source_items rsi on rsi.id = item_id
  group by rsi.source_id
) sub
where s.id = sub.source_id;
```

Feed `trust_score` back into two places: (a) the classification prompt
(§3), as context — "this source has historically produced N% genuine
patterns" nudges confidence without hand-tuning per-source rules; (b) as a
literal input to a `enabled = trust_score > 0.1` check after some minimum
sample size, so a source that's 95% marketing over 30+ items quietly stops
being polled rather than requiring you to notice and prune it manually.

**Discard reasons as a taxonomy, not free text.** When an admin discards a
finding, offer a small fixed set of reasons in the dropdown
(`already_covered`, `too_marketing`, `too_niche`, `wrong_category`,
`not_interesting`) rather than an open text box. Free text feels more
expressive but produces nothing you can `GROUP BY` — a fixed taxonomy over
even a few dozen discards tells you within a month whether the classifier's
false-positive mode is "marketing slipping through" (tune the classifier
prompt) or "genuine but off-topic" (tune the vendor/category scope), which
are different fixes.

**What this deliberately doesn't do:** no embedding-based "similar findings
you discarded before" pre-filter, no fine-tuning, no separate scoring
model. At the volume this system runs at (dozens of items/week across 8
vendors), a trust-score-weighted prompt and a taxonomy you can eyeball in a
SQL query monthly outperforms anything requiring labeled-data
infrastructure — worth revisiting only if source count or item volume
grows an order of magnitude.

---

## Build-log material

Things in this design worth their own post once built, roughly in the order
you'll hit them:

1. **The dbt-materialization dead end (§5).** Why the pattern that works
   for `github-activity-pipeline`'s read-only aggregates actively breaks
   the moment a table needs to be referenced by UUID from three other
   systems. Good "two similar-looking problems, opposite right answers"
   post.
2. **Dedup-after-summarize, not dedup-after-fetch (§3).** The naive
   title-matching approach and why it fails specifically on vendor
   changelog reuse patterns.
3. **The audit-source overload trap (§9).** Why "it's already in the
   enum and the name fits" was the wrong call, tied back to what the audit
   trail is actually *for* (distinguishing trust/cadence profiles, not
   just labeling who wrote what).
4. **Trust-score-as-prompt-context vs. trust-score-as-filter (§10).**
   Where the line is between "nudge the LLM" and "just turn the source
   off," and why you don't need a model to make that call.

## Resolved since the first draft

- **Public-facing surface for findings:** a real `/research` section
  (index + `/research/{slug}` detail pages), decided explicitly rather than
  the chat/MCP/digest-only alternative. Built — see §5's status-model note
  and the site-side file list below.
- **Where the ingestion pipeline runs:** confirmed as a separate repo +
  GitHub Actions, per the original recommendation.

## Still open before the ingestion pipeline can go live

- The actual `pipeline-research-agent` repo doesn't exist yet — nothing has
  been created or pushed anywhere. It needs: a new GitHub repo, secrets
  (`ANTHROPIC_API_KEY`, a Supabase service-role connection string,
  optionally `GITHUB_TOKEN` for the releases poller), and real source URLs
  entered via the now-live `/admin/research-sources` page (deliberately
  left empty rather than seeded with guessed changelog/RSS URLs).
- Poll cadence budget: at ~30-40 sources on a 6h default cadence, rough
  Claude call volume for classification+summarization alone is worth
  estimating against `ai_usage_log` costs before picking a default —
  `getAiOpsSummary()` ([ai-usage.ts:65-126](src/lib/ai-usage.ts)) already
  gives you the cost-per-operation breakdown to sanity-check this once the
  first week of data exists.
- Whether `pipeline-research-agent`'s scheduler talks to Postgres directly
  (service-role connection string) or goes through this site's
  service-role Supabase client via a private API route — direct Postgres
  matches the `github-activity-pipeline` precedent and avoids adding a new
  authenticated API surface to this repo.
- Migration `0030_research_findings.sql` hasn't been applied to the live
  Supabase project yet, and the `research-digest` cron in `vercel.json`
  hasn't been deployed — both are just files in this worktree right now.
- `/research` isn't linked from the site nav yet — `nav_links` is
  admin-editable data (see `0003_nav_and_home_sections.sql`), not code, so
  add it via `/admin/nav` once there's real content to point at.

## Site-side files this worktree added or touched

Schema: `supabase/migrations/0030_research_findings.sql`.

New: `src/lib/research-findings.ts`, `src/lib/research-digest.ts`,
`src/app/(site)/research/page.tsx`, `src/app/(site)/research/[slug]/page.tsx`,
`src/app/admin/(protected)/research-findings/*`,
`src/app/admin/(protected)/research-sources/*`,
`src/app/api/cron/research-digest/route.ts`.

Touched: `src/lib/audit-log.ts`, `src/lib/openapi-spec.ts`,
`src/lib/site-content.ts`, `src/lib/cron-runs.ts`, `src/lib/chat-index.ts`,
`src/lib/content-search.ts`, `src/app/api/mcp/route.ts`,
`src/app/api/admin/audit-logs/route.ts`,
`src/app/admin/(protected)/layout.tsx`, `vercel.json`, `docs/API.md`,
`src/lib/agent-activity.ts`,
`src/app/(site)/agent-activity/page.tsx`.

`getPipelineWorkflowStatus()` in the last two now watches *two* pipeline
repos, not one — `edamiee/github-activity-pipeline` and, assumed,
`edamiee/research_agent` (matching the local `~/research_agent` directory
this section's ingestion agent was scaffolded into, which is not yet
pushed to GitHub as of this writing). Each workflow fetch fails
independently now (404 for a repo that doesn't exist yet just means no
card for it) rather than one failure blanking every pipeline's status —
that isolation was necessary, not optional, once a second, currently
nonexistent repo entered the list. If the real repo ends up named
differently, update the `repo` string in `PIPELINES`.

Verified: `tsc --noEmit` clean, `eslint` clean, `next build`'s compile +
TypeScript pass clean (static prerendering itself fails in this worktree
for lack of real Supabase credentials — expected, not a code issue), the
project's Tailwind custom-class checker clean. Not yet verified: an actual
browser session against live data, since that needs the migration applied
and real source URLs entered first.
