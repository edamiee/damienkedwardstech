-- Records every content write across all five write paths (admin UI, the
-- external Site Agent, the research/dev-log agents, and the Telegram
-- admin agent) so it's possible to see what changed, when, and via which
-- channel — useful now that several of those paths act without a human
-- review step.

create table public.content_audit_log (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'admin_ui' | 'site_agent' | 'research_agent' | 'dev_log_agent' | 'telegram_agent'
  action text not null, -- e.g. 'post.create', 'post.update', 'post.delete', 'site_content.update'
  entity_type text not null, -- 'post' | 'case_study' | 'site_content' | 'testimonial' | 'service' | 'nav_link' | 'project' | 'github_link'
  entity_id text, -- uuid as text (site_content uses its key here instead, since it has no id)
  summary text not null,
  created_at timestamptz not null default now()
);

create index content_audit_log_created_at_idx on public.content_audit_log (created_at desc);

alter table public.content_audit_log enable row level security;

-- No public policy — written only via the service-role admin client from
-- server-side code, read only by admins.
create policy "admin full access to content audit log" on public.content_audit_log
  for all using (public.is_admin()) with check (public.is_admin());
