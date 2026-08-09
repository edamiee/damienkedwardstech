"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export async function saveTestimonial(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const payload = {
    author_name: String(formData.get("author_name") ?? "").trim(),
    author_title: String(formData.get("author_title") ?? "").trim() || null,
    quote: String(formData.get("quote") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    visible: formData.get("visible") === "on",
  };

  if (id) {
    await admin.supabase.from("testimonials").update(payload).eq("id", id);
  } else {
    await admin.supabase.from("testimonials").insert(payload);
  }

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonial(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  await admin.supabase.from("testimonials").delete().eq("id", id);

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
