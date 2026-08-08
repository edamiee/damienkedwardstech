-- Tracks where a case study came from, mirroring posts.source, so the
-- homepage's Hermes activity feed can tell agent-published content apart
-- from content edited by hand in /admin.

alter table public.case_studies add column if not exists source text not null default 'admin';
