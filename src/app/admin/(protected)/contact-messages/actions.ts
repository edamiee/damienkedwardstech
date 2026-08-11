"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export const CONTACT_MESSAGE_STATUSES = ["new", "triage", "replied", "archived"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export async function setContactMessageStatus(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !CONTACT_MESSAGE_STATUSES.includes(status as ContactMessageStatus)) return;

  await admin.supabase.from("contact_messages").update({ status }).eq("id", id);
  revalidatePath("/admin/contact-messages");
}
