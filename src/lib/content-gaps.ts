import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// The three places a "no good content for this" signal can come from —
// see supabase/migrations/0026_content_gap_source.sql.
export type ContentGapSource = "chat_gap" | "chat_downvote" | "search_gap";

export async function logContentGap(
  supabase: SupabaseClient,
  params: { question: string; source: ContentGapSource; bestSimilarity?: number | null }
): Promise<void> {
  try {
    await supabase.from("chat_content_gaps").insert({
      question: params.question,
      source: params.source,
      best_similarity: params.bestSimilarity ?? null,
    });
  } catch (err) {
    console.error("failed to log content gap", err);
  }
}
