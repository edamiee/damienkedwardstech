import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeReadingMinutes } from "@/lib/reading-time";

export type AgentDraft = {
  title: string;
  excerpt: string;
  tags: string[];
  body_markdown: string;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Agents are instructed to respond in a fixed TITLE:/EXCERPT:/TAGS:/BODY:
// format rather than JSON — verified against a real web-search response
// that JSON breaks on: Claude's search citations can render as inline
// <cite index="..."> tags with embedded double quotes, which aren't
// reliably escaped when the model is asked to nest them in a JSON string,
// producing unparseable output. Plain delimited sections have no such
// escaping problem no matter what the body contains.
export function parseAgentDraft(text: string): AgentDraft {
  const titleMatch = /^TITLE:\s*(.+)$/m.exec(text);
  const excerptMatch = /^EXCERPT:\s*(.+)$/m.exec(text);
  const tagsMatch = /^TAGS:\s*(.+)$/m.exec(text);
  const bodyMatch = /^BODY:\s*\n([\s\S]+)$/m.exec(text);

  if (!titleMatch || !bodyMatch) {
    throw new Error("Agent didn't return a parseable draft — try again.");
  }

  return {
    title: titleMatch[1].trim(),
    excerpt: excerptMatch?.[1]?.trim() ?? "",
    tags: (tagsMatch?.[1] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    body_markdown: bodyMatch[1].trim(),
  };
}

// Always saved unpublished — every agent-drafted post lands here so a
// human reviews and explicitly publishes it, nothing goes out on its own.
export async function saveAgentDraftPost(
  supabase: SupabaseClient,
  draft: AgentDraft
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      slug: slugify(draft.title),
      title: draft.title,
      excerpt: draft.excerpt,
      body_markdown: draft.body_markdown,
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      reading_minutes: computeReadingMinutes(draft.body_markdown),
      published: false,
      source: "agent",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data;
}
