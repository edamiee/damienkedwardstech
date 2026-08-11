"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export const TOPIC_STATUSES = ["open", "writing", "published", "closed"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export async function setTopicStatus(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !TOPIC_STATUSES.includes(status as TopicStatus)) return;

  await admin.supabase.from("topic_suggestions").update({ status }).eq("id", id);
  revalidatePath("/admin/topics");
  revalidatePath("/write-next");
}
