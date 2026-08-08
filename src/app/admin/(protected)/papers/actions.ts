"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function savePaper(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim();
  const published = formData.get("published") === "on";

  const payload = {
    title,
    slug: slugify(title),
    description,
    url,
    published,
    published_at: published ? new Date().toISOString() : null,
  };

  if (id) {
    await admin.supabase.from("papers").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("papers").insert(payload);
  }

  revalidatePath("/admin/papers");
  revalidatePath("/writing");
}

export async function deletePaper(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("papers").delete().eq("id", id);

  revalidatePath("/admin/papers");
  revalidatePath("/writing");
}
