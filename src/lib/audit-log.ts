import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditSource =
  | "admin_ui"
  | "site_agent"
  | "research_agent"
  | "dev_log_agent"
  | "telegram_agent"
  | "mcp_agent";

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
