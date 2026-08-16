"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { logContentChange } from "@/lib/audit-log";
import { VENDORS, type Vendor } from "@/lib/research-findings";

const SOURCE_TYPES = ["rss", "github_releases", "changelog_scrape", "forum"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

export async function saveResearchSource(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const vendor = String(formData.get("vendor") ?? "").trim();
  const sourceType = String(formData.get("source_type") ?? "").trim();
  if (!VENDORS.includes(vendor as Vendor) || !SOURCE_TYPES.includes(sourceType as SourceType)) {
    return;
  }

  const payload = {
    vendor,
    name: String(formData.get("name") ?? "").trim(),
    source_type: sourceType,
    url: String(formData.get("url") ?? "").trim(),
    poll_cadence_minutes: Number(formData.get("poll_cadence_minutes") ?? 360),
    enabled: formData.get("enabled") === "on",
  };

  let sourceId = id;
  if (id) {
    await admin.supabase.from("research_sources").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase
      .from("research_sources")
      .insert(payload)
      .select("id")
      .single();
    sourceId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "research_source.update" : "research_source.create",
    entity_type: "research_source",
    entity_id: sourceId,
    summary: `${id ? "Updated" : "Added"} research source "${payload.name}" (${payload.vendor})`,
  });

  revalidatePath("/admin/research-sources");
}

export async function deleteResearchSource(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("research_sources")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("research_sources").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "research_source.delete",
    entity_type: "research_source",
    entity_id: id,
    summary: `Deleted research source "${existing?.name ?? id}"`,
  });

  revalidatePath("/admin/research-sources");
}
