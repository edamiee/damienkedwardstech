-- Adds: scheduled publishing + shareable draft preview links for posts and
-- case studies, pull-quote impact stats on case studies, a public archive
-- table for the homepage's weekly note, and an optional testimonials
-- section.

-- ---------- Scheduled publishing + draft previews ----------

alter table public.posts add column if not exists publish_at timestamptz;
alter table public.posts add column if not exists preview_token uuid not null default gen_random_uuid();

alter table public.case_studies add column if not exists publish_at timestamptz;
alter table public.case_studies add column if not exists preview_token uuid not null default gen_random_uuid();

-- ---------- Case study impact stats ----------

alter table public.case_studies add column if not exists stats jsonb not null default '[]';

-- ---------- Weekly note archive ----------

create table public.weekly_insights (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.weekly_insights enable row level security;

create policy "public reads weekly insights" on public.weekly_insights
  for select using (true);
create policy "admin full access to weekly insights" on public.weekly_insights
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Testimonials (optional, off by default via testimonials_enabled) ----------

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_title text,
  quote text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "public reads visible testimonials" on public.testimonials
  for select using (visible or public.is_admin());
create policy "admin full access to testimonials" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());
