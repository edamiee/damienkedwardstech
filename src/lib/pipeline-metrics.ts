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

// Reads public.pipeline_activity_metrics — a view over the
// github-activity-pipeline project's marts schema (separate repo, same
// Postgres instance). Queried live on every page load, not cached content:
// the build log entry it backs is specifically about that pipeline being
// real, so the numbers on the page should be too.
export async function getPipelineActivityMetrics(): Promise<PipelineActivityMetrics | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("pipeline_activity_metrics").select("*").single();

  if (error || !data) return null;

  return {
    totalCommits: data.total_commits ?? 0,
    activeRepos: data.active_repos ?? 0,
    totalPrs: data.total_prs ?? 0,
    mergedPrs: data.merged_prs ?? 0,
    avgPrCycleTimeHours: data.avg_pr_cycle_time_hours,
    totalIssues: data.total_issues ?? 0,
    closedIssues: data.closed_issues ?? 0,
    avgIssueCloseHours: data.avg_issue_close_hours,
    lastIngestedAt: data.last_ingested_at,
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
