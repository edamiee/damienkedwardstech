"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function saveProject(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";

  const payload = {
    name,
    slug: slugify(name),
    description,
    url,
    image_url: imageUrl,
    visible,
  };

  if (id) {
    await admin.supabase.from("site_projects").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("site_projects").insert(payload);
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("site_projects").delete().eq("id", id);

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}
