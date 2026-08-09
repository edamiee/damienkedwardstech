import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RelatedItem = {
  source_type: string;
  title: string;
  url_path: string;
  similarity: number;
};

// Nearest-neighbor lookup against content_embeddings via the
// match_related_content RPC (migration 0009). Fails soft — an unbuilt or
// stale chat index just means no related section renders, not a broken page.
export async function getRelatedContent(
  sourceType: "post" | "case_study",
  sourceId: string,
  count = 3
): Promise<RelatedItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_related_content", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    match_count: count,
  });

  if (error) {
    console.error("related content lookup failed", error);
    return [];
  }
  return (data ?? []) as RelatedItem[];
}
