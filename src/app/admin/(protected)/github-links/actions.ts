"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

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

export async function deleteGithubLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("github_links").delete().eq("id", id);

  revalidatePath("/admin/github-links");
  revalidatePath("/projects");
}
