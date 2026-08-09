import { createAdminClient } from "@/lib/supabase/admin";
import { reindexAction } from "./actions";

export default async function AdminChatIndexPage({
  searchParams,
}: PageProps<"/admin/chat-index">) {
  const { indexed } = await searchParams;
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("content_embeddings")
    .select("id", { count: "exact", head: true });

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
    </div>
  );
}
