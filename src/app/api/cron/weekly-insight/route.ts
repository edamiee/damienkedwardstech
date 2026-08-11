import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyInsight, saveWeeklyInsight } from "@/lib/weekly-insight";
import { sendWeeklyNewsletter } from "@/lib/newsletter-send";
import { recordCronRun } from "@/lib/cron-runs";

// Hit by Vercel Cron (see vercel.json) once a week. Vercel automatically
// sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests
// when CRON_SECRET is set on the project — that's the only thing gating
// this route, since there's no user session in a cron invocation.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  try {
    const insight = await generateWeeklyInsight();
    await saveWeeklyInsight(supabase, insight);
    const newsletter = await sendWeeklyNewsletter(supabase, insight);

    await recordCronRun("weekly-insight", "ok", `sent to ${newsletter?.sent ?? 0} subscribers`);
    return NextResponse.json({ ok: true, insight, newsletter });
  } catch (err) {
    await recordCronRun("weekly-insight", "error", err instanceof Error ? err.message : String(err));
    throw err;
  }
}
