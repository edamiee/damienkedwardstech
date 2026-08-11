"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { reindexContentEmbeddings } from "@/lib/chat-index";

export async function reindexAction() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const { chunks } = await reindexContentEmbeddings();
  redirect(`/admin/chat-index?indexed=${chunks}`);
}

// Promotes a content gap into a public /write-next topic. The title is
// admin-edited (defaults to the gap's raw question in the form) rather than
// published verbatim — see supabase/migrations/0029_topic_suggestions.sql.
export async function publishTopic(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const title = String(formData.get("title") ?? "").trim();
  const sourceGapQuestion = String(formData.get("source_gap_question") ?? "").trim();
  if (!title) return;

  await admin.supabase.from("topic_suggestions").insert({
    title,
    source_gap_question: sourceGapQuestion || null,
  });

  revalidatePath("/admin/chat-index");
  revalidatePath("/admin/topics");
  revalidatePath("/write-next");
}
