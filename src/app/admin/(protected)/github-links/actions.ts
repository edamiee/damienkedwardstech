"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { callClaude } from "@/lib/anthropic";
import { parseAgentDraft, saveAgentDraftPost } from "@/lib/agent-draft";
import { fetchRecentCommits } from "@/lib/github-activity";

export async function saveGithubLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const payload = {
    label: String(formData.get("label") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    visible: formData.get("visible") === "on",
  };

  if (id) {
    await admin.supabase.from("github_links").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("github_links").insert(payload);
  }

  revalidatePath("/admin/github-links");
  revalidatePath("/projects");
}

// Human-in-the-loop dev-log agent: pulls the last 7 days of commits across
// every visible linked repo and drafts a "what I shipped" post from them —
// saved unpublished, same review-before-publish pattern as the research
// agent. Skips entirely (no draft, no empty post) when there's nothing to
// report, rather than manufacturing filler content.
export async function draftDevLogWithAgent() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const { data: links } = await admin.supabase
    .from("github_links")
    .select("url")
    .eq("visible", true);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const commitLists = await Promise.all(
    (links ?? []).map((l) => fetchRecentCommits(l.url, since))
  );
  const commits = commitLists.flat();

  if (commits.length === 0) {
    redirect(
      `/admin/github-links?agent_error=${encodeURIComponent(
        "No commits in the last 7 days across linked repos — nothing to draft."
      )}`
    );
  }

  const commitLog = commits.map((c) => `- [${c.repo}] ${c.message}`).join("\n");
  const system = `You are drafting a short "what I shipped this week" blog post for damienkedwards.tech from a raw git commit log. Write in a plain, direct, technically credible voice — no hype, no emoji. Group related commits into a coherent narrative rather than just listing them; skip trivial commits (typo fixes, formatting) unless that's genuinely all there is. Respond with EXACTLY this format and nothing else — no preamble:

TITLE: <title>
EXCERPT: <one sentence>
TAGS: <2-4 lowercase tags, comma-separated>
BODY:
<200-500 words of markdown, ## subheadings optional, no leading title heading>`;

  let errorMessage: string | null = null;
  let draft = null as ReturnType<typeof parseAgentDraft> | null;

  try {
    const text = await callClaude(system, `Commit log from the last 7 days:\n${commitLog}`, 3000);
    draft = parseAgentDraft(text);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Draft failed.";
  }

  if (errorMessage || !draft) {
    redirect(`/admin/github-links?agent_error=${encodeURIComponent(errorMessage ?? "Draft failed.")}`);
  }

  const inserted = await saveAgentDraftPost(admin.supabase, draft);
  if (!inserted) {
    redirect(`/admin/github-links?agent_error=${encodeURIComponent("Failed to save draft.")}`);
  }

  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${inserted.id}`);
}

export async function deleteGithubLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("github_links").delete().eq("id", id);

  revalidatePath("/admin/github-links");
  revalidatePath("/projects");
}
