import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/anthropic";
import { parseAgentDraft, saveAgentDraftPost } from "@/lib/agent-draft";
import { VENDOR_LABELS, PATTERN_CATEGORY_LABELS, type ResearchFinding } from "@/lib/research-findings";

const SYSTEM_PROMPT = `You write "Note of the week"-style build-log posts for damienkedwards.tech, an AI & data engineer's professional site. Plain, direct, technically credible voice — no hype, no marketing fluff, no emoji. You'll be given a list of already-reviewed, structured findings about genuine architectural patterns in the data stack (Snowflake, Databricks, dbt, Spark, Qlik, Redshift, MS Fabric, n8n) — not raw vendor announcements, already filtered and fact-checked by a human. Your job is to synthesize them into one coherent post: find the throughline (a shared theme, a contrast between vendors, a trend), don't just restate each finding as a bullet point. Write like the recent build-log entries you're shown below, not like a changelog recap.

Respond with EXACTLY this format and nothing else — no preamble, no "Sources" section (appended separately), no XML/HTML tags:

TITLE: <title>
EXCERPT: <one sentence>
TAGS: <2-4 lowercase tags, comma-separated>
BODY:
<400-800 words of markdown body using ## subheadings, no leading title heading since the title is separate>`;

function formatFindingForPrompt(f: ResearchFinding): string {
  return [
    `[${VENDOR_LABELS[f.vendor]} / ${PATTERN_CATEGORY_LABELS[f.pattern_category]}] ${f.title}`,
    `What changed: ${f.what_changed}`,
    `Why it matters: ${f.why_it_matters}`,
  ].join("\n");
}

export type DigestResult = {
  postId: string;
  findingIds: string[];
  sources: { url: string; title: string }[];
};

// Pulls every approved-but-not-yet-digested finding from the last `days`
// days and synthesizes them into one draft post via the same
// TITLE:/EXCERPT:/TAGS:/BODY: contract draftPostWithAgent() already uses —
// saved unpublished via saveAgentDraftPost(), landing in the normal
// /admin/posts review queue. Returns null (no-op, not an error) if there's
// nothing new to digest — a quiet week shouldn't produce an empty post.
export async function generateResearchDigest(
  supabase: SupabaseClient,
  days = 7
): Promise<DigestResult | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: findings } = await supabase
    .from("research_findings")
    .select(
      "id, vendor, pattern_category, title, what_changed, why_it_matters, source_urls, found_at"
    )
    .eq("status", "approved")
    .is("digested_at", null)
    .gte("found_at", since)
    .order("found_at", { ascending: true });

  const candidates = (findings ?? []) as ResearchFinding[];
  if (candidates.length === 0) return null;

  // Style exemplars — same reason draftPostWithAgent() pulls existing
  // titles: without concrete recent examples, a digest synthesizing 5-15
  // structured findings tends to read like a bulleted vendor-changelog
  // recap instead of this site's own build-log voice.
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("title, excerpt")
    .eq("published", true)
    .eq("is_site_post", true)
    .order("published_at", { ascending: false })
    .limit(3);

  const exemplars = (recentPosts ?? [])
    .map((p) => `- "${p.title}"${p.excerpt ? `: ${p.excerpt}` : ""}`)
    .join("\n");

  const userPrompt = [
    `Recent build-log entries, for voice reference:\n${exemplars || "(none yet)"}`,
    `\nFindings from the last ${days} days:\n\n${candidates.map(formatFindingForPrompt).join("\n\n")}`,
  ].join("\n");

  const text = await callClaude(SYSTEM_PROMPT, userPrompt, 4096, "research_digest");
  const draft = parseAgentDraft(text);

  const sources = candidates.flatMap((f) =>
    f.source_urls.map((url) => ({ url, title: f.title }))
  );
  if (sources.length > 0) {
    const seen = new Set<string>();
    const deduped = sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
    draft.body_markdown += `\n\n## Sources\n${deduped.map((s) => `- [${s.title}](${s.url})`).join("\n")}`;
  }

  const inserted = await saveAgentDraftPost(supabase, draft, "pipeline_research_agent");
  if (!inserted) throw new Error("Failed to save digest draft post.");

  const findingIds = candidates.map((f) => f.id);
  await supabase
    .from("research_findings")
    .update({ digest_post_id: inserted.id, digested_at: new Date().toISOString() })
    .in("id", findingIds);

  return { postId: inserted.id, findingIds, sources };
}
