-- Replaces the single projects_github_url site_content field with a proper
-- list, so multiple repos can be linked from the gated projects page (one
-- per project, or just several you want to point people at).

create table public.github_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.github_links enable row level security;

-- Gated the same way as site_projects — only shown on the gated /projects
-- page, so only admin or an invited viewer should be able to read it.
create policy "admin or invited viewer reads github links" on public.github_links
  for select using (public.is_admin() or public.is_project_viewer());
create policy "admin full access to github links" on public.github_links
  for all using (public.is_admin()) with check (public.is_admin());

-- Carry over whatever single URL was already set, so nothing disappears.
insert into public.github_links (label, url, sort_order)
select 'github', value, 0
from public.site_content
where key = 'projects_github_url' and value <> '';
