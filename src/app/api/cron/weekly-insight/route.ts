import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyInsight, saveWeeklyInsight } from "@/lib/weekly-insight";

// Hit by Vercel Cron (see vercel.json) once a week. Vercel automatically
// sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests
// when CRON_SECRET is set on the project — that's the only thing gating
// this route, since there's no user session in a cron invocation.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const insight = await generateWeeklyInsight();
  await saveWeeklyInsight(createAdminClient(), insight);

  return NextResponse.json({ ok: true, insight });
}
