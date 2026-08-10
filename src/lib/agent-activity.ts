import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_SOURCE_LABELS, type AuditSource } from "@/lib/audit-log";

export type AgentActivityEntry = {
  id: string;
  source: AuditSource;
  action: string;
  entity_type: string;
  summary: string;
  created_at: string;
};

const SOURCES = Object.keys(AUDIT_SOURCE_LABELS) as AuditSource[];

// Public read of content_audit_log: the table itself has no public RLS
// policy (admin-only), so this goes through the service-role client like
// hermes-activity.ts does. Safe to expose — every summary written across
// the five write paths is a plain description (a title, a label), never
// draft content or contact-form PII; see the call sites in
// src/app/admin/**/actions.ts and src/app/api/admin/content/route.ts.
export const getRecentAgentActivity = cache(
  async (limit = 30): Promise<AgentActivityEntry[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("content_audit_log")
      .select("id, source, action, entity_type, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []) as AgentActivityEntry[];
  }
);

export type AgentSourceStatus = {
  source: AuditSource;
  label: string;
  lastActive: string | null;
  totalCount: number;
};

// Reads from audit_source_totals rather than counting content_audit_log
// rows directly — that table gets its detail rows purged after 7 days (see
// the purge-agent-logs cron), but these totals are bumped by trigger on
// every insert and never touched by the purge, so "N writes total" stays a
// lifetime figure instead of resetting to whatever's left in the window.
export const getAgentSourceStatus = cache(
  async (): Promise<AgentSourceStatus[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("audit_source_totals")
      .select("source, total_count, last_active");

    const bySource = new Map(
      (data ?? []).map((row) => [row.source as AuditSource, row])
    );

    return SOURCES.map((source) => {
      const row = bySource.get(source);
      return {
        source,
        label: AUDIT_SOURCE_LABELS[source],
        lastActive: row?.last_active ?? null,
        totalCount: row?.total_count ?? 0,
      };
    });
  }
);

export type PipelineWorkflowStatus = {
  name: string;
  active: boolean;
  lastSuccess: string | null;
  htmlUrl: string;
};

const PIPELINE_REPO = "edamiee/github-activity-pipeline";
const PIPELINE_WORKFLOWS = [
  { file: "pipeline.yml", label: "Ingest and transform" },
  { file: "freshness-check.yml", label: "Freshness check" },
];

// Reads the separate github-activity-pipeline repo's own GitHub Actions
// history directly — a real external signal, not anything stored in this
// site's database. Public repo, so this works unauthenticated; revalidated
// every 5 minutes rather than fetched fresh on every page view.
export const getPipelineWorkflowStatus = cache(
  async (): Promise<PipelineWorkflowStatus[]> => {
    try {
      return await Promise.all(
        PIPELINE_WORKFLOWS.map(async ({ file, label }) => {
          const [workflowRes, runsRes] = await Promise.all([
            fetch(
              `https://api.github.com/repos/${PIPELINE_REPO}/actions/workflows/${file}`,
              { headers: { accept: "application/vnd.github+json" }, next: { revalidate: 300 } }
            ),
            fetch(
              `https://api.github.com/repos/${PIPELINE_REPO}/actions/workflows/${file}/runs?status=success&per_page=1`,
              { headers: { accept: "application/vnd.github+json" }, next: { revalidate: 300 } }
            ),
          ]);

          const workflow = await workflowRes.json();
          const runs = await runsRes.json();

          return {
            name: label,
            active: workflow.state === "active",
            lastSuccess: runs.workflow_runs?.[0]?.updated_at ?? null,
            htmlUrl:
              workflow.html_url ??
              `https://github.com/${PIPELINE_REPO}/actions/workflows/${file}`,
          };
        })
      );
    } catch (err) {
      console.error("failed to fetch pipeline workflow status", err);
      return [];
    }
  }
);
