import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Same naive per-IP limiter shape as /api/chat/feedback — cheap to call
// (one insert) but still shouldn't be open to unbounded spam.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

const VOTER_COOKIE = "write_next_voter";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }

  let body: { topic_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topicId = (body.topic_id ?? "").trim();
  if (!topicId) {
    return NextResponse.json({ error: "topic_id is required" }, { status: 400 });
  }

  const existingVoterId = request.cookies.get(VOTER_COOKIE)?.value;
  const voterId = existingVoterId || randomUUID();

  const supabase = createAdminClient();
  // A unique(topic_id, voter_id) constraint backs this — a repeat vote from
  // the same cookie hits Postgres error 23505, treated as an idempotent
  // success rather than an error. One-way upvote only, no un-vote.
  const { error } = await supabase
    .from("topic_suggestion_votes")
    .insert({ topic_id: topicId, voter_id: voterId });

  if (error && error.code !== "23505") {
    console.error("topic vote insert failed", error);
    return NextResponse.json({ error: "Could not save vote." }, { status: 500 });
  }

  const { count } = await supabase
    .from("topic_suggestion_votes")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);

  const response = NextResponse.json({ ok: true, votes: count ?? 0 });
  if (!existingVoterId) {
    response.cookies.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}
