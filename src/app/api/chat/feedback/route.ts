import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logContentGap } from "@/lib/content-gaps";

// Same naive per-IP limiter shape as /api/chat — this endpoint is cheap to
// call (one insert, no LLM/embedding cost) but still shouldn't be open to
// unbounded spam.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }

  let body: { question?: string; answer?: string; rating?: string; sources?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = (body.question ?? "").trim().slice(0, 500);
  const answer = (body.answer ?? "").trim().slice(0, 2000);
  const rating = body.rating;
  if (!question || !answer || (rating !== "up" && rating !== "down")) {
    return NextResponse.json(
      { error: "question, answer, and rating ('up' or 'down') are required" },
      { status: 400 }
    );
  }

  const sources = Array.isArray(body.sources) ? body.sources.slice(0, 10) : [];

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chat_feedback")
    .insert({ question, answer, rating, sources });

  if (error) {
    console.error("chat feedback insert failed", error);
    return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  }

  // A down-vote is the same underlying signal as a weak-retrieval gap —
  // the answer cleared the similarity threshold but still wasn't good
  // enough — so it goes in the same list rather than a separate one only
  // visible via the up/down counts.
  if (rating === "down") {
    await logContentGap(supabase, { question, source: "chat_downvote" });
  }

  return NextResponse.json({ ok: true });
}
