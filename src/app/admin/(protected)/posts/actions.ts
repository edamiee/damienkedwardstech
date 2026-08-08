"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function savePost(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");
  const published = formData.get("published") === "on";

  const payload = {
    title,
    slug: slugify(title),
    excerpt,
    body_markdown: bodyMarkdown,
    published,
    published_at: published ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    await admin.supabase.from("posts").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("posts").insert(payload);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/writing");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("posts").delete().eq("id", id);

  revalidatePath("/admin/posts");
  revalidatePath("/writing");
  redirect("/admin/posts");
}
