-- Replaces the pipeline_activity_metrics view with an equivalent function.
-- dbt's `table` materialization does DROP TABLE ... CASCADE on
-- marts.fct_commits/fct_pull_requests/fct_issues on every run (every 6h) —
-- a view has a hard catalog dependency on its source tables, so it got
-- dropped along with them. A function's body isn't dependency-tracked the
-- same way, so it survives the underlying tables being replaced.
drop view if exists public.pipeline_activity_metrics;

create or replace function public.get_pipeline_activity_metrics()
returns table (
  total_commits bigint,
  active_repos bigint,
  total_prs bigint,
  merged_prs bigint,
  avg_pr_cycle_time_hours numeric,
  total_issues bigint,
  closed_issues bigint,
  avg_issue_close_hours numeric,
  last_ingested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select count(*) from marts.fct_commits),
    (select count(distinct repo_id) from marts.fct_commits),
    (select count(*) from marts.fct_pull_requests),
    (select count(*) from marts.fct_pull_requests where is_merged),
    (select avg(cycle_time_hours) from marts.fct_pull_requests where is_merged),
    (select count(*) from marts.fct_issues),
    (select count(*) from marts.fct_issues where issue_state = 'closed'),
    (select avg(time_to_close_hours) from marts.fct_issues where issue_state = 'closed'),
    (select max(fetched_at) from raw.repos);
end;
$$;
