"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export async function addViewer(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!email) return;

  await admin.supabase.from("project_viewer_invites").upsert({ email, note });
  revalidatePath("/admin/viewers");
}

export async function removeViewer(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const email = formData.get("email") as string;
  await admin.supabase.from("project_viewer_invites").delete().eq("email", email);
  revalidatePath("/admin/viewers");
}
