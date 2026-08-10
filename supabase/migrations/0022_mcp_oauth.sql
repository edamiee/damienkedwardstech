-- Minimal OAuth 2.1 authorization server in front of /api/mcp's admin
-- tier, for MCP clients (claude.ai's web connector UI) that only support
-- OAuth and don't yet have access to request-header auth. Consent is
-- gated by the existing admin login (public.admins) — there's no separate
-- user base here, this just lets an already-logged-in admin mint a scoped
-- token for a specific OAuth client instead of hand-carrying the static
-- ADMIN_API_SECRET into a UI that can't accept it.
--
-- Client registration is left open (unauthenticated), per usual OAuth
-- dynamic client registration practice — registering only gets a client a
-- client_id, never access. Actual access still requires an admin to
-- complete /api/mcp/authorize and approve that specific client.

create table public.mcp_oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null,
  created_at timestamptz not null default now()
);

create table public.mcp_oauth_codes (
  code text primary key,
  client_id text not null references public.mcp_oauth_clients (client_id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  admin_id uuid not null references public.admins (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.mcp_oauth_tokens (
  access_token text primary key,
  refresh_token text unique not null,
  client_id text not null references public.mcp_oauth_clients (client_id) on delete cascade,
  admin_id uuid not null references public.admins (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index mcp_oauth_tokens_refresh_token_idx on public.mcp_oauth_tokens (refresh_token);

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;

-- No public policies — every touch point is server-side code using the
-- service-role client (registration is open at the application layer, not
-- the database layer: the route itself has no auth check, but it still
-- goes through the service-role client rather than exposing these tables
-- to anon/authenticated roles directly).
create policy "admin full access to mcp oauth clients" on public.mcp_oauth_clients
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin full access to mcp oauth codes" on public.mcp_oauth_codes
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin full access to mcp oauth tokens" on public.mcp_oauth_tokens
  for all using (public.is_admin()) with check (public.is_admin());
