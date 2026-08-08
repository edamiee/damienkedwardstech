-- Editable key/value copy for the homepage hero and About page — the parts
-- of the site that were previously hardcoded in the React components and
-- had no admin editor. Runs against the same shared Supabase project as
-- 0001_personal_site.sql.

create table public.site_content (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- This is exactly the copy already shown on public pages, so public read
-- is fine — only the admin can write.
create policy "public reads site content" on public.site_content
  for select using (true);
create policy "admin full access to site content" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());
