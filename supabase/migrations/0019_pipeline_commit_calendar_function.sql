-- Backs a GitHub-style contribution heatmap on the pipeline build log
-- entry, replacing a static dashboard screenshot with something queried
-- live. Same security-definer/search_path pattern as
-- get_pipeline_activity_metrics() and for the same reason: dbt's `table`
-- materialization drops and recreates marts.fct_commits on every run, so
-- a view over it would get dropped too — a function survives that.
create or replace function public.get_pipeline_commit_calendar()
returns table (
  commit_date date,
  commit_count bigint
)
language sql
security definer
set search_path = public
as $$
  select committed_date, count(*)
  from marts.fct_commits
  where committed_date >= current_date - interval '370 days'
  group by committed_date
  order by committed_date;
$$;
