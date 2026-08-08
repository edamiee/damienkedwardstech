-- Makes the top nav and the homepage "What I do" cards admin-editable
-- instead of hardcoded in the React components. Runs against the same
-- shared Supabase project as the earlier migrations.

create table public.nav_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.home_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.nav_links enable row level security;
alter table public.home_services enable row level security;

create policy "public reads visible nav links" on public.nav_links
  for select using (visible or public.is_admin());
create policy "admin full access to nav links" on public.nav_links
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads visible home services" on public.home_services
  for select using (visible or public.is_admin());
create policy "admin full access to home services" on public.home_services
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed with what's currently hardcoded, so the site looks identical until
-- you actually change something in /admin/nav or /admin/services.
insert into public.nav_links (label, href, sort_order) values
  ('About', '/about', 0),
  ('Writing', '/writing', 1),
  ('Projects', '/projects', 2),
  ('Contact', '/contact', 3);

insert into public.home_services (title, body, sort_order) values
  ('Data pipelines', 'Ingestion, transformation, and orchestration that hold up under real production load.', 0),
  ('LLM integration', 'Wiring Claude and other models into products as features, not demos.', 1),
  ('Applied AI features', 'The interface layer on top — the part your users and customers actually touch.', 2);
