import { createAdminClient } from "@/lib/supabase/admin";
import { reindexAction } from "./actions";
import { formatRelativeTime } from "@/lib/format-relative-time";

type ContentGap = {
  question: string;
  count: number;
  lastAsked: string;
};

// Groups by normalized question text rather than showing every raw row —
// the same question asked with different casing/whitespace across several
// visits is one gap, not several, and the count is what makes a gap worth
// acting on.
function groupGaps(rows: { question: string; created_at: string }[]): ContentGap[] {
  const groups = new Map<string, ContentGap>();
  for (const row of rows) {
    const key = row.question.trim().toLowerCase().replace(/\s+/g, " ");
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (row.created_at > existing.lastAsked) existing.lastAsked = row.created_at;
    } else {
      groups.set(key, { question: row.question.trim(), count: 1, lastAsked: row.created_at });
    }
  }
  return [...groups.values()].sort(
    (a, b) => b.count - a.count || (a.lastAsked < b.lastAsked ? 1 : -1)
  );
}

export default async function AdminChatIndexPage({
  searchParams,
}: PageProps<"/admin/chat-index">) {
  const { indexed } = await searchParams;
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("content_embeddings")
    .select("id", { count: "exact", head: true });

  const { data: gapRows } = await supabase
    .from("chat_content_gaps")
    .select("question, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const gaps = groupGaps(gapRows ?? []).slice(0, 15);

  const { data: feedbackRows } = await supabase
    .from("chat_feedback")
    .select("question, rating, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const upCount = (feedbackRows ?? []).filter((r) => r.rating === "up").length;
  const downCount = (feedbackRows ?? []).filter((r) => r.rating === "down").length;
  const recentDownvotes = (feedbackRows ?? []).filter((r) => r.rating === "down").slice(0, 15);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl">Chat index</h1>
      <p className="mt-1 text-sm text-muted">
        The homepage chat widget answers from a search index built over your
        published posts, papers, case studies, and a teaser (name +
        description only, never the link) for each visible gated project —
        not live database queries. Rebuild it here after publishing or
        editing content so the chat&apos;s answers stay current.
      </p>

      <div className="mt-6 rounded-sm border border-line bg-surface p-5">
        <p className="text-sm">
          Currently indexed: <span className="font-data">{count ?? 0}</span> chunks
        </p>
        {indexed !== undefined && (
          <p className="mt-2 text-sm text-teal">Reindexed — {indexed} chunks embedded.</p>
        )}
        <form action={reindexAction} className="mt-4">
          <button
            type="submit"
            className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground"
          >
            Rebuild index now
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted">
        Requires <code className="font-data">VOYAGE_API_KEY</code> to be set —
        see the setup notes from whoever configured this feature.
      </p>

      <h2 className="mt-10 font-display text-lg">Content gaps</h2>
      <p className="mt-1 text-sm text-muted">
        Questions the chat widget couldn&apos;t ground in a good match from the
        index above — worth writing about if they keep coming up.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-surface">
        {gaps.map((gap) => (
          <li key={gap.question} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <p className="text-sm">{gap.question}</p>
            <p className="shrink-0 whitespace-nowrap text-xs text-muted">
              {gap.count > 1 ? `asked ${gap.count}×, ` : ""}
              {formatRelativeTime(gap.lastAsked)}
            </p>
          </li>
        ))}
        {gaps.length === 0 && (
          <li className="px-4 py-3 text-sm text-teal">No unanswered questions logged.</li>
        )}
      </ul>

      <h2 className="mt-10 font-display text-lg">Answer feedback</h2>
      <p className="mt-1 text-sm text-muted">
        Thumbs up/down from the chat widget. Down-votes are the ones worth
        digging into — retrieval found something, but the answer missed.
      </p>
      <p className="mt-3 text-sm">
        <span className="text-teal">{upCount} up</span>
        {" · "}
        <span className="text-rust">{downCount} down</span>
      </p>
      <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-surface">
        {recentDownvotes.map((row, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <p className="text-sm">{row.question}</p>
            <p className="shrink-0 whitespace-nowrap text-xs text-muted">
              {formatRelativeTime(row.created_at)}
            </p>
          </li>
        ))}
        {recentDownvotes.length === 0 && (
          <li className="px-4 py-3 text-sm text-teal">No down-votes logged.</li>
        )}
      </ul>
    </div>
  );
}
