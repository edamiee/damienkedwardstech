"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { approveFinding, discardFinding } from "@/lib/research-findings";
import { DISCARD_REASONS, type DiscardReason } from "./status";

export async function approveFindingAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await approveFinding(id, admin.user.email ?? "admin");
  revalidatePath("/admin/research-findings");
  revalidatePath("/research");
}

export async function discardFindingAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !DISCARD_REASONS.includes(reason as DiscardReason)) return;

  await discardFinding(id, reason as DiscardReason, admin.user.email ?? "admin");
  revalidatePath("/admin/research-findings");
}
