-- Every Anthropic/Voyage call the site makes (chat, admin drafting, cron
-- jobs, telegram agent, embeddings) is invisible today — no token usage,
-- cost, or latency is captured anywhere. This log backs the public /ai-ops
-- transparency page. Append-only, not covered by the purge-agent-logs cron
-- (that only purges content_audit_log) — this one accumulates for all-time
-- totals.
create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('anthropic', 'voyage')),
  model text not null,
  operation text not null,
  status text not null default 'ok' check (status in ('ok', 'error')),
  input_tokens int,
  output_tokens int,
  total_tokens int,
  latency_ms int not null,
  estimated_cost_usd numeric(10,6),
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_usage_log_created_at_idx on public.ai_usage_log (created_at desc);

alter table public.ai_usage_log enable row level security;

-- No public policy — the /ai-ops page reads curated aggregates through the
-- service-role client, same as /agent-activity does for cron_runs and
-- audit_source_totals.
create policy "admin full access to ai usage log" on public.ai_usage_log
  for all using (public.is_admin()) with check (public.is_admin());
