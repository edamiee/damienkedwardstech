"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { computeReadingMinutes } from "@/lib/reading-time";
import { callClaudeWithWebSearch } from "@/lib/anthropic";
import { parseAgentDraft, saveAgentDraftPost } from "@/lib/agent-draft";
import { logContentChange } from "@/lib/audit-log";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function savePost(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const published = formData.get("published") === "on";
  const publishAtRaw = String(formData.get("publish_at") ?? "").trim();
  const publishAt = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;
  const series = String(formData.get("series") ?? "").trim() || null;
  const seriesOrder = Number(formData.get("series_order") ?? 0);

  const payload = {
    title,
    slug: slugify(title),
    excerpt,
    body_markdown: bodyMarkdown,
    cover_image_url: coverImageUrl,
    tags,
    series,
    series_order: seriesOrder,
    reading_minutes: computeReadingMinutes(bodyMarkdown),
    published,
    published_at: published ? publishAt || new Date().toISOString() : null,
    publish_at: publishAt,
    updated_at: new Date().toISOString(),
  };

  let postId = id;
  if (id) {
    await admin.supabase.from("posts").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase.from("posts").insert(payload).select("id").single();
    postId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "post.update" : "post.create",
    entity_type: "post",
    entity_id: postId,
    summary: `${id ? "Updated" : "Created"} "${title}"${published ? " (published)" : ""}`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/writing");
  redirect("/admin/posts");
}

// Human-in-the-loop research agent: researches the given topic via web
// search and drafts a full post, saved unpublished so nothing goes out
// under Damien's name without review. Redirects into the normal editor
// (with its existing preview-link/publish flow) rather than auto-publishing.
export async function draftPostWithAgent(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) {
    redirect(`/admin/posts?agent_error=${encodeURIComponent("Enter a topic first.")}`);
  }

  const { data: existing } = await admin.supabase
    .from("posts")
    .select("title")
    .order("published_at", { ascending: false })
    .limit(20);
  const existingTitles = (existing ?? []).map((p) => p.title).join("; ") || "(none yet)";

  const system = `You are drafting a blog post for damienkedwards.tech, an AI & data engineer's professional site. Write in a plain, direct, technically credible voice — no hype, no marketing fluff, no emoji. Research the given topic using web search, then respond with EXACTLY this format and nothing else — no preamble, and never use XML/HTML citation tags like <cite> anywhere in the output, write cited facts as plain prose instead:

TITLE: <title>
EXCERPT: <one sentence>
TAGS: <2-4 lowercase tags, comma-separated>
BODY:
<400-800 words of markdown body using ## subheadings, no leading title heading since the title is separate, no "Sources" section — that's appended separately>

Avoid topics already covered here: ${existingTitles}.`;

  let errorMessage: string | null = null;
  let draft = null as ReturnType<typeof parseAgentDraft> | null;
  let sources: { url: string; title: string }[] = [];

  try {
    const result = await callClaudeWithWebSearch(system, `Topic: ${topic}`, 4096, 5);
    draft = parseAgentDraft(result.text);
    sources = result.sources;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Draft failed.";
  }

  if (errorMessage || !draft) {
    redirect(`/admin/posts?agent_error=${encodeURIComponent(errorMessage ?? "Draft failed.")}`);
  }

  if (sources.length > 0) {
    draft.body_markdown += `\n\n## Sources\n${sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`;
  }

  const inserted = await saveAgentDraftPost(admin.supabase, draft, "research_agent");
  if (!inserted) {
    redirect(`/admin/posts?agent_error=${encodeURIComponent("Failed to save draft.")}`);
  }

  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${inserted.id}`);
}

export async function deletePost(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("posts")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("posts").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "post.delete",
    entity_type: "post",
    entity_id: id,
    summary: `Deleted "${existing?.title ?? id}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/writing");
  redirect("/admin/posts");
}
