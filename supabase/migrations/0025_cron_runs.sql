-- Last-run health for Vercel Cron jobs. Without this, a silently failing
-- cron (purge-agent-logs, weekly-insight) is invisible — the job just stops
-- happening and nothing surfaces it. Each cron route upserts its own row on
-- every invocation; /agent-activity reads this to show "last run" + status.

create table public.cron_runs (
  job_name text primary key,
  last_run_at timestamptz not null default now(),
  status text not null default 'ok' check (status in ('ok', 'error')),
  detail text
);

alter table public.cron_runs enable row level security;

-- No public policy — written via the service-role client from the cron
-- routes themselves, read publicly through the same service-role pattern
-- getAgentSourceStatus() already uses (the data is non-sensitive: a job
-- name, a timestamp, ok/error).
create policy "admin full access to cron runs" on public.cron_runs
  for all using (public.is_admin()) with check (public.is_admin());
