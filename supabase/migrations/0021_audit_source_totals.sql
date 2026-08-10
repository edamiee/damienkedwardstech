-- content_audit_log rows now get purged after 7 days (see the
-- purge-agent-logs cron) to keep the table small, but /agent-activity's
-- per-source "N writes total" and "last active" stats should stay
-- lifetime figures, not reset to whatever's left in the trailing window.
-- This table is bumped by trigger on every insert and is never touched by
-- the purge job, so it survives row deletion untouched.
create table public.audit_source_totals (
  source text primary key,
  total_count bigint not null default 0,
  last_active timestamptz
);

alter table public.audit_source_totals enable row level security;

create policy "admin full access to audit source totals" on public.audit_source_totals
  for all using (public.is_admin()) with check (public.is_admin());

-- Backfill from whatever's currently in content_audit_log before the
-- trigger takes over for everything going forward.
insert into public.audit_source_totals (source, total_count, last_active)
select source, count(*), max(created_at)
from public.content_audit_log
group by source
on conflict (source) do nothing;

create function public.bump_audit_source_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_source_totals (source, total_count, last_active)
  values (new.source, 1, new.created_at)
  on conflict (source) do update
    set total_count = audit_source_totals.total_count + 1,
        last_active = new.created_at;
  return new;
end;
$$;

create trigger content_audit_log_bump_totals
  after insert on public.content_audit_log
  for each row execute function public.bump_audit_source_totals();
