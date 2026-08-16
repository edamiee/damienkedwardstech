import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateResearchDigest } from "@/lib/research-digest";
import { reindexContentEmbeddings } from "@/lib/chat-index";
import { recordCronRun } from "@/lib/cron-runs";

// Hit weekly by Vercel Cron (see vercel.json), ahead of Monday's
// weekly-insight — same auth shape as that route: Vercel sends
// `Authorization: Bearer $CRON_SECRET` automatically on cron-triggered
// requests, which is the only thing gating this since there's no user
// session in a cron invocation.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  try {
    const digest = await generateResearchDigest(supabase);

    // Keeps the chat widget's RAG index from lagging newly-approved
    // findings by more than a week, without a separate incremental-index
    // code path — see docs/research-assistant/design.md §6.
    await reindexContentEmbeddings();

    await recordCronRun(
      "research-digest",
      "ok",
      digest ? `drafted post ${digest.postId} from ${digest.findingIds.length} findings` : "nothing to digest"
    );
    return NextResponse.json({ ok: true, digest });
  } catch (err) {
    await recordCronRun("research-digest", "error", err instanceof Error ? err.message : String(err));
    throw err;
  }
}
