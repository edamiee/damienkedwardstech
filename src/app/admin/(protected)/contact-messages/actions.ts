"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { CONTACT_MESSAGE_STATUSES, type ContactMessageStatus } from "./status";

export async function setContactMessageStatus(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !CONTACT_MESSAGE_STATUSES.includes(status as ContactMessageStatus)) return;

  await admin.supabase.from("contact_messages").update({ status }).eq("id", id);
  revalidatePath("/admin/contact-messages");
}
