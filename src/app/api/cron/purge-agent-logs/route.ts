import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordCronRun } from "@/lib/cron-runs";

const RETENTION_DAYS = 7;

// Hit by Vercel Cron (see vercel.json) once a day. content_audit_log has no
// other cleanup path, so without this it grows forever — the admin
// audit-log page only ever needs a recent window, not a permanent archive.
// /agent-activity's per-source "N writes total" and "last active" figures
// are unaffected: those read from audit_source_totals, a separate table
// bumped by trigger on every insert and never touched by this delete.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content_audit_log")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    await recordCronRun("purge-agent-logs", "error", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordCronRun("purge-agent-logs", "ok", `deleted ${data?.length ?? 0} rows`);
  return NextResponse.json({ ok: true, deleted: data?.length ?? 0 });
}
