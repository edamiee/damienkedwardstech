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

export type CommitCalendarDay = { date: string; count: number };

type CommitCalendarRow = { commit_date: string; commit_count: number };

// Backs the contribution heatmap on the pipeline build log entry. Same
// live-query-on-every-load approach as getPipelineActivityMetrics above.
export async function getPipelineCommitCalendar(): Promise<CommitCalendarDay[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_pipeline_commit_calendar");
  if (error || !data) return [];

  return (data as CommitCalendarRow[]).map((row) => ({
    date: row.commit_date,
    count: row.commit_count,
  }));
}

export type CommitCalendarWeek = { date: string | null; count: number }[];

// Lays out the last ~53 weeks as GitHub does: columns are weeks, rows are
// Sun–Sat, padded with null-date cells so the grid stays a clean rectangle
// even though the data window doesn't start on a Sunday.
export function buildCommitCalendarWeeks(
  days: CommitCalendarDay[],
  weekCount = 53
): CommitCalendarWeek[] {
  const counts = new Map(days.map((d) => [d.date, d.count]));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (weekCount * 7 - 1));
  // Roll back to the Sunday on/before `start` so every week is a full column.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const cells: { date: string | null; count: number }[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, count: counts.get(iso) ?? 0 });
  }
  // Pad the final week out to a full 7 days.
  while (cells.length % 7 !== 0) cells.push({ date: null, count: 0 });

  const weeks: CommitCalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
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
