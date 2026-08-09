import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PipelineActivityMetrics = {
  totalCommits: number;
  activeRepos: number;
  totalPrs: number;
  mergedPrs: number;
  avgPrCycleTimeHours: number | null;
  totalIssues: number;
  closedIssues: number;
  avgIssueCloseHours: number | null;
  lastIngestedAt: string | null;
};

// Calls public.get_pipeline_activity_metrics() — a function (not a view)
// over the github-activity-pipeline project's marts schema (separate repo,
// same Postgres instance). A view would get dropped every ~6h: dbt's table
// materialization does DROP TABLE ... CASCADE on the marts tables on every
// run, and views have a hard catalog dependency on their source tables. A
// function's body isn't dependency-tracked the same way, so it survives.
// Queried live on every page load, not cached content: the build log entry
// it backs is specifically about that pipeline being real, so the numbers
// on the page should be too.
type PipelineActivityMetricsRow = {
  total_commits: number;
  active_repos: number;
  total_prs: number;
  merged_prs: number;
  avg_pr_cycle_time_hours: number | null;
  total_issues: number;
  closed_issues: number;
  avg_issue_close_hours: number | null;
  last_ingested_at: string | null;
};

export async function getPipelineActivityMetrics(): Promise<PipelineActivityMetrics | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_pipeline_activity_metrics");

  const row = (data as PipelineActivityMetricsRow[] | null)?.[0];
  if (error || !row) return null;

  return {
    totalCommits: row.total_commits ?? 0,
    activeRepos: row.active_repos ?? 0,
    totalPrs: row.total_prs ?? 0,
    mergedPrs: row.merged_prs ?? 0,
    avgPrCycleTimeHours: row.avg_pr_cycle_time_hours,
    totalIssues: row.total_issues ?? 0,
    closedIssues: row.closed_issues ?? 0,
    avgIssueCloseHours: row.avg_issue_close_hours,
    lastIngestedAt: row.last_ingested_at,
  };
}

// "—" rather than "0%"/"NaN%" when there's nothing to divide yet — a true
// zero-rate and "no data" mean different things and shouldn't look the same.
export function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
