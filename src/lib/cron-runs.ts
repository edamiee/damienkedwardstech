import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type CronJobName = "purge-agent-logs" | "weekly-insight" | "synthetic-check";

// Recorded at the end of every cron invocation (success or failure) so a
// silently broken cron is visible on /agent-activity instead of just...
// not happening. See supabase/migrations/0025_cron_runs.sql.
export async function recordCronRun(
  jobName: CronJobName,
  status: "ok" | "error",
  detail?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("cron_runs").upsert({
      job_name: jobName,
      last_run_at: new Date().toISOString(),
      status,
      detail: detail ?? null,
    });
  } catch (err) {
    console.error("failed to record cron run", jobName, err);
  }
}

export type CronJobHealth = {
  name: CronJobName;
  label: string;
  lastRunAt: string | null;
  status: "ok" | "error" | null;
  detail: string | null;
  overdue: boolean;
};

// Expected cadence per job, with slack, used to flag a job as overdue even
// if it has never actually errored — a cron that Vercel silently stops
// invoking wouldn't write an "error" row at all, so freshness is checked
// independently of the recorded status.
const CRON_JOBS: { name: CronJobName; label: string; expectedHours: number }[] = [
  { name: "purge-agent-logs", label: "Purge agent logs (daily)", expectedHours: 24 * 1.5 },
  { name: "weekly-insight", label: "Weekly insight + newsletter (Mondays)", expectedHours: 24 * 7 * 1.5 },
  { name: "synthetic-check", label: "Chat/search synthetic check (daily)", expectedHours: 24 * 1.5 },
];

export const getCronHealth = cache(async (): Promise<CronJobHealth[]> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cron_runs")
    .select("job_name, last_run_at, status, detail");

  const byName = new Map((data ?? []).map((row) => [row.job_name as CronJobName, row]));
  const now = Date.now();

  return CRON_JOBS.map(({ name, label, expectedHours }) => {
    const row = byName.get(name);
    const lastRunAt = row?.last_run_at ?? null;
    const overdue =
      !lastRunAt || now - new Date(lastRunAt).getTime() > expectedHours * 60 * 60 * 1000;

    return {
      name,
      label,
      lastRunAt,
      status: (row?.status as "ok" | "error" | undefined) ?? null,
      detail: row?.detail ?? null,
      overdue,
    };
  });
});
