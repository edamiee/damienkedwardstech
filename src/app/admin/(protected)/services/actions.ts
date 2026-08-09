"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { logContentChange } from "@/lib/audit-log";

export async function saveService(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    visible: formData.get("visible") === "on",
  };

  let serviceId = id;
  if (id) {
    await admin.supabase.from("home_services").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase
      .from("home_services")
      .insert(payload)
      .select("id")
      .single();
    serviceId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "service.update" : "service.create",
    entity_type: "service",
    entity_id: serviceId,
    summary: `${id ? "Updated" : "Added"} service card "${payload.title}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function deleteService(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("home_services")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("home_services").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "service.delete",
    entity_type: "service",
    entity_id: id,
    summary: `Deleted service card "${existing?.title ?? id}"`,
  });

  revalidatePath("/admin/services");
  revalidatePath("/");
}
