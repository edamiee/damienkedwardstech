-- Records chat-widget questions the retrieval step couldn't ground well
-- (best match below content-search.ts's SIMILARITY_THRESHOLD) so the admin
-- chat-index page can surface real, recurring gaps in what the site's
-- content actually covers — distinct from content_audit_log, which tracks
-- writes, not read-side misses.

create table public.chat_content_gaps (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  best_similarity float,
  created_at timestamptz not null default now()
);

create index chat_content_gaps_created_at_idx on public.chat_content_gaps (created_at desc);

alter table public.chat_content_gaps enable row level security;

-- No public policy — written only via the service-role admin client from
-- the chat route, read only by admins.
create policy "admin full access to chat content gaps" on public.chat_content_gaps
  for all using (public.is_admin()) with check (public.is_admin());
