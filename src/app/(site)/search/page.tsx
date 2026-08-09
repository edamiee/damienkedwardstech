import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/voyage";

export const dynamic = "force-dynamic";

type MatchRow = {
  source_type: string;
  title: string;
  url_path: string;
  chunk_text: string;
  similarity: number;
};

type Result = {
  title: string;
  url_path: string;
  snippet: string;
  kind: string;
  gated: boolean;
};

const KIND_LABELS: Record<string, string> = {
  post: "Post",
  paper: "Document",
  case_study: "Case study",
  project: "Gated project",
};

const SIMILARITY_THRESHOLD = 0.3;

async function search(query: string): Promise<Result[]> {
  const supabase = createAdminClient();
  const queryEmbedding = await embedOne(query, "query");
  const { data, error } = await supabase.rpc("match_content_embeddings", {
    query_embedding: queryEmbedding,
    match_count: 12,
  });

  if (error) {
    console.error("search failed", error);
    return [];
  }

  const matches = (data ?? []) as MatchRow[];
  const seen = new Set<string>();
  const results: Result[] = [];

  for (const m of matches) {
    if (m.similarity < SIMILARITY_THRESHOLD || seen.has(m.url_path + m.title)) continue;
    seen.add(m.url_path + m.title);
    results.push({
      title: m.title,
      url_path: m.url_path,
      snippet: m.chunk_text.slice(0, 220),
      kind: KIND_LABELS[m.source_type] ?? m.source_type,
      gated: m.source_type === "project",
    });
  }

  return results;
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  let results: Result[] = [];
  let searchFailed = false;
  if (query) {
    try {
      results = await search(query);
    } catch (err) {
      console.error("search page failed", err);
      searchFailed = true;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Search</h1>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Finds posts, case studies, and documents by meaning, not just keyword
        match.
      </p>

      <form method="get" className="mt-8 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="e.g. RAG pipelines, data engineering..."
          className="w-full max-w-md rounded-sm border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-teal focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground"
        >
          Search
        </button>
      </form>

      <div className="mt-10">
        {!query && <p className="text-sm text-muted">Type something to search.</p>}

        {query && searchFailed && (
          <p className="text-sm text-rust">
            Search isn&apos;t available right now — try again shortly.
          </p>
        )}

        {query && !searchFailed && results.length === 0 && (
          <p className="text-sm text-muted">No matches for &quot;{query}&quot;.</p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-line">
            {results.map((r) => (
              <li key={r.url_path + r.title} className="py-5">
                <Link href={r.url_path} className="group block">
                  <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">
                    {r.kind}
                  </span>
                  <span className="mt-1 block font-display text-lg group-hover:text-teal">
                    {r.title}
                  </span>
                  <span className="mt-1 block max-w-[65ch] text-sm text-muted">
                    {r.gated ? `${r.snippet} — sign in to see it.` : r.snippet}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
