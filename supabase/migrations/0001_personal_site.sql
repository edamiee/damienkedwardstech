-- Adds tables for damienkedwardstech.com's content and gated-project access.
-- Runs against the SAME Supabase project as Class_app-web/web — that
-- project's own migrations create `public.admins` and `public.is_admin()`,
-- which this file depends on and does not redefine. Run this in the
-- Supabase SQL editor (or `supabase db push`) against that shared project,
-- not a new one.

create extension if not exists pgcrypto;

-- ---------- Blog posts ----------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body_markdown text not null,
  published boolean not null default false,
  published_at timestamptz,
  source text not null default 'admin', -- 'admin' | 'hermes' | 'claude'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- White papers (external links, not hosted files) ----------

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  url text not null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Gated project listing (e.g. the Arcade game) ----------

create table public.site_projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  url text not null,
  visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Gated-project viewer allowlist ----------
-- Add a row here (by email) to grant someone magic-link access to
-- /projects. Damien's own access comes from public.admins, not this table —
-- admins can always see gated projects without being listed here too.

create table public.project_viewer_invites (
  email text primary key,
  note text,
  invited_at timestamptz not null default now()
);

create or replace function public.is_project_viewer()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.project_viewer_invites
    where email = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

-- ---------- RLS ----------

alter table public.posts enable row level security;
alter table public.papers enable row level security;
alter table public.site_projects enable row level security;
alter table public.project_viewer_invites enable row level security;

-- Public can read published posts/papers; admin has full read/write on both.
create policy "public reads published posts" on public.posts
  for select using (published or public.is_admin());
create policy "admin full access to posts" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads published papers" on public.papers
  for select using (published or public.is_admin());
create policy "admin full access to papers" on public.papers
  for all using (public.is_admin()) with check (public.is_admin());

-- Gated projects: readable by admin or an invited viewer; writable by admin only.
create policy "admin or invited viewer reads projects" on public.site_projects
  for select using (public.is_admin() or public.is_project_viewer());
create policy "admin full access to projects" on public.site_projects
  for all using (public.is_admin()) with check (public.is_admin());

-- Invite list: admin manages it; a signed-in user may check their own invite
-- (used by the app to tell "you're not on the list" apart from "you're not
-- signed in" without needing admin rights).
create policy "admin full access to invites" on public.project_viewer_invites
  for all using (public.is_admin()) with check (public.is_admin());
create policy "viewer can check own invite" on public.project_viewer_invites
  for select using (email = lower(coalesce((auth.jwt() ->> 'email'), '')));
