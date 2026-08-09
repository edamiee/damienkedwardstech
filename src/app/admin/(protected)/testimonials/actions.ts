"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { logContentChange } from "@/lib/audit-log";

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

  let testimonialId = id;
  if (id) {
    await admin.supabase.from("testimonials").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase
      .from("testimonials")
      .insert(payload)
      .select("id")
      .single();
    testimonialId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "testimonial.update" : "testimonial.create",
    entity_type: "testimonial",
    entity_id: testimonialId,
    summary: `${id ? "Updated" : "Added"} testimonial from ${payload.author_name}`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonial(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("testimonials")
    .select("author_name")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("testimonials").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "testimonial.delete",
    entity_type: "testimonial",
    entity_id: id,
    summary: `Deleted testimonial from ${existing?.author_name ?? id}`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
