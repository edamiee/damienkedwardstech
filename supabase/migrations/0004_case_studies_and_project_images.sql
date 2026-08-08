-- Adds case studies (structured project writeups, distinct from blog posts)
-- and an optional thumbnail image for gated project cards. Runs against the
-- same shared Supabase project as the earlier migrations.

create table public.case_studies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  problem text,
  approach text,
  outcome text,
  stack text,
  project_url text,
  published boolean not null default false,
  published_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_studies enable row level security;

create policy "public reads published case studies" on public.case_studies
  for select using (published or public.is_admin());
create policy "admin full access to case studies" on public.case_studies
  for all using (public.is_admin()) with check (public.is_admin());

-- Optional screenshot/thumbnail shown on gated project cards.
alter table public.site_projects add column if not exists image_url text;

-- Add a nav entry for the new public section without disturbing whatever
-- order/labels you've already customized in /admin/nav.
insert into public.nav_links (label, href, sort_order)
select 'Case studies', '/case-studies', coalesce(max(sort_order), 0) + 1
from public.nav_links;
