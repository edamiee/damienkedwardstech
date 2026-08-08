"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { reindexContentEmbeddings } from "@/lib/chat-index";

export async function reindexAction() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const { chunks } = await reindexContentEmbeddings();
  redirect(`/admin/chat-index?indexed=${chunks}`);
}
