"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@/lib/site-content";

export async function saveSiteContent(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const keys = Object.keys(SITE_CONTENT_DEFAULTS) as SiteContentKey[];
  const rows = keys.map((key) => ({
    key,
    value: String(formData.get(key) ?? ""),
    updated_at: new Date().toISOString(),
  }));

  await admin.supabase.from("site_content").upsert(rows, { onConflict: "key" });

  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/about");
}
