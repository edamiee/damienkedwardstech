-- Aggregates the github-activity-pipeline project's marts tables (a
-- separate repo/schema, ingested via its own GitHub Actions workflow —
-- see /how-it-works and the build log) into one summary row the site can
-- query the same way it queries anything else: through the public schema,
-- via the existing service-role admin client. No cross-schema PostgREST
-- exposure needed, and the raw/staging schemas stay unexposed.
create or replace view public.pipeline_activity_metrics as
select
  (select count(*) from marts.fct_commits) as total_commits,
  (select count(distinct repo_id) from marts.fct_commits) as active_repos,
  (select count(*) from marts.fct_pull_requests) as total_prs,
  (select count(*) from marts.fct_pull_requests where is_merged) as merged_prs,
  (select avg(cycle_time_hours) from marts.fct_pull_requests where is_merged) as avg_pr_cycle_time_hours,
  (select count(*) from marts.fct_issues) as total_issues,
  (select count(*) from marts.fct_issues where issue_state = 'closed') as closed_issues,
  (select avg(time_to_close_hours) from marts.fct_issues where issue_state = 'closed') as avg_issue_close_hours,
  (select max(fetched_at) from raw.repos) as last_ingested_at;
