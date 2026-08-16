import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditSource =
  | "admin_ui"
  | "site_agent"
  | "research_agent"
  | "dev_log_agent"
  | "telegram_agent"
  | "mcp_agent"
  | "mcp_client"
  | "pipeline_research_agent";

export const AUDIT_SOURCE_LABELS: Record<AuditSource, string> = {
  admin_ui: "Admin UI",
  site_agent: "Site Agent",
  research_agent: "Research agent",
  dev_log_agent: "Dev-log agent",
  telegram_agent: "Telegram agent",
  mcp_agent: "MCP agent",
  mcp_client: "MCP client",
  // Distinct from "research_agent" (a human types a topic, one web-search
  // call happens, right now) — this is the autonomous pipeline-research-agent
  // repo's continuous ingest/classify/summarize/digest pipeline. Conflating
  // the two would make this source's "last active"/"total writes" stats on
  // /agent-activity meaningless for both. See docs/research-assistant/design.md §9.
  pipeline_research_agent: "Pipeline research agent",
};

// Fire-and-forget-ish: awaited so ordering is predictable, but a logging
// failure is swallowed rather than thrown — an audit trail write should
// never be the reason the actual content operation fails.
export async function logContentChange(entry: {
  source: AuditSource;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("content_audit_log").insert({
      source: entry.source,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      summary: entry.summary,
    });
  } catch (err) {
    console.error("audit log write failed", err);
  }
}
