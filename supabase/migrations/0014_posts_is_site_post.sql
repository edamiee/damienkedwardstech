-- Distinguishes posts that are about damienkedwardstech/the arcade itself
-- (dev-log "what shipped" style writing) from posts about other topics
-- (AI/data engineering writing generally), so /admin/posts can filter and
-- badge them separately.
alter table public.posts add column if not exists is_site_post boolean not null default false;
