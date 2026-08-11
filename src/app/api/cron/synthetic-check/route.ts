import { NextResponse, type NextRequest } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { searchContent } from "@/lib/content-search";
import { recordCronRun } from "@/lib/cron-runs";

// A realistic visitor question, run daily against the same retrieval the
// /search page and /api/chat use, then fed through the same Anthropic
// generation call — catches a broken Voyage key, an empty/stale embeddings
// index, or an Anthropic outage before a visitor hits it. See vercel.json
// for the schedule.
const TEST_QUERY = "What has Damien built recently?";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await searchContent(TEST_QUERY, 3);
    if (results.length === 0) {
      throw new Error("search returned no results for the test query");
    }

    const contextBlock = results
      .map((r) => `Source: ${r.title}\n${r.snippet}`)
      .join("\n\n---\n\n");
    const answer = await callClaude(
      "Answer the question in one sentence using only the context provided.",
      `CONTEXT:\n${contextBlock}\n\nQUESTION: ${TEST_QUERY}`,
      150,
      "synthetic_check"
    );
    if (!answer.trim()) {
      throw new Error("chat generation returned an empty answer");
    }

    await recordCronRun(
      "synthetic-check",
      "ok",
      `search: ${results.length} results · chat: ${answer.trim().length} chars`
    );
    return NextResponse.json({ ok: true, searchResults: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "synthetic check failed";
    await recordCronRun("synthetic-check", "error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
