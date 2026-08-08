import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/anthropic";

const SYSTEM_PROMPT = `You write a short, original weekly note for the homepage of an AI/data engineer's professional site. One or two sentences, plain prose, no markdown, no emoji, no hashtags. Share your own observation about AI, data engineering, or building AI-powered products. Never fabricate a quote or attribute a saying to a real person. Respond with only the note itself, nothing else — no preamble, no quotation marks around it.`;

export async function generateWeeklyInsight(): Promise<string> {
  const text = await callClaude(SYSTEM_PROMPT, "Write this week's note.", 200);
  return text.trim();
}

export async function saveWeeklyInsight(supabase: SupabaseClient, text: string) {
  await supabase
    .from("site_content")
    .upsert(
      { key: "weekly_ai_insight", value: text, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
}
