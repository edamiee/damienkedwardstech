"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export async function saveNavLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const payload = {
    label: String(formData.get("label") ?? "").trim(),
    href: String(formData.get("href") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    visible: formData.get("visible") === "on",
  };

  if (id) {
    await admin.supabase.from("nav_links").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("nav_links").insert(payload);
  }

  revalidatePath("/admin/nav");
  revalidatePath("/", "layout");
}

export async function deleteNavLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("nav_links").delete().eq("id", id);

  revalidatePath("/admin/nav");
  revalidatePath("/", "layout");
}
