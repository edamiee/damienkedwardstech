"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { logContentChange } from "@/lib/audit-log";

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

  let navLinkId = id;
  if (id) {
    await admin.supabase.from("nav_links").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase.from("nav_links").insert(payload).select("id").single();
    navLinkId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "nav_link.update" : "nav_link.create",
    entity_type: "nav_link",
    entity_id: navLinkId,
    summary: `${id ? "Updated" : "Added"} nav link "${payload.label}" → ${payload.href}`,
  });

  revalidatePath("/admin/nav");
  revalidatePath("/", "layout");
}

export async function deleteNavLink(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("nav_links")
    .select("label")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("nav_links").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "nav_link.delete",
    entity_type: "nav_link",
    entity_id: id,
    summary: `Deleted nav link "${existing?.label ?? id}"`,
  });

  revalidatePath("/admin/nav");
  revalidatePath("/", "layout");
}
