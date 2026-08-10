import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_SOURCE_LABELS, type AuditSource } from "@/lib/audit-log";

// Remote read endpoint over the same content_audit_log table the
// /admin/audit-log page and the public /agent-activity page read — for an
// authenticated script/agent that wants the full trail (including
// entity_id) rather than the public page's trimmed-down view.
//
// GET /api/admin/audit-logs?source=site_agent&limit=50
// Authorization: Bearer <ADMIN_API_SECRET>
//
// Query params (all optional):
//   source - one of admin_ui | site_agent | research_agent | dev_log_agent
//            | telegram_agent | mcp_agent
//   limit  - max rows, default 50, capped at 200
//
// Response: { entries: [{ id, source, action, entity_type, entity_id,
//              summary, created_at }, ...] }

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Same global-not-per-IP rate limit as /api/admin/content, for the same
// reason: every caller shares the one secret, so total volume is the
// meaningful thing to bound.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestTimestamps.push(now);
  return requestTimestamps.length > RATE_LIMIT;
}

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited()) {
    return NextResponse.json(
      { error: "Too many requests — try again in a minute." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);

  const source = searchParams.get("source");
  if (source && !(source in AUDIT_SOURCE_LABELS)) {
    return NextResponse.json(
      { error: "invalid source", validSources: Object.keys(AUDIT_SOURCE_LABELS) },
      { status: 400 }
    );
  }

  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const supabase = createAdminClient();
  let query = supabase
    .from("content_audit_log")
    .select("id, source, action, entity_type, entity_id, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (source) query = query.eq("source", source as AuditSource);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
