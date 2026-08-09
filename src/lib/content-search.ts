import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/voyage";

type MatchRow = {
  source_type: string;
  title: string;
  url_path: string;
  chunk_text: string;
  similarity: number;
};

export type SearchResult = {
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

// Shared by the /search page and the public search_content MCP tool —
// semantic search over published content via pgvector. snippetLength
// defaults to the compact web list's size; MCP callers pass a longer one
// since there's no layout to keep tidy and fuller context is more useful.
export async function searchContent(
  query: string,
  matchCount = 12,
  snippetLength = 220
): Promise<SearchResult[]> {
  const supabase = createAdminClient();
  const queryEmbedding = await embedOne(query, "query");
  const { data, error } = await supabase.rpc("match_content_embeddings", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) {
    console.error("search failed", error);
    return [];
  }

  const matches = (data ?? []) as MatchRow[];
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const m of matches) {
    if (m.similarity < SIMILARITY_THRESHOLD || seen.has(m.url_path + m.title)) continue;
    seen.add(m.url_path + m.title);
    results.push({
      title: m.title,
      url_path: m.url_path,
      snippet: m.chunk_text.slice(0, snippetLength),
      kind: KIND_LABELS[m.source_type] ?? m.source_type,
      gated: m.source_type === "project",
    });
  }

  return results;
}
