"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@/lib/site-content";
import { generateWeeklyInsight, saveWeeklyInsight } from "@/lib/weekly-insight";

function revalidatePublicPages() {
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/", "layout");
}

export async function saveSiteContent(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const keys = Object.keys(SITE_CONTENT_DEFAULTS) as SiteContentKey[];
  const rows = keys.map((key) => ({
    key,
    // chat_enabled is a checkbox — "on" when checked, absent when not —
    // rather than free text, so it needs its own true/false mapping.
    value:
      key === "chat_enabled"
        ? formData.get("chat_enabled") === "on"
          ? "true"
          : "false"
        : String(formData.get(key) ?? ""),
    updated_at: new Date().toISOString(),
  }));

  await admin.supabase.from("site_content").upsert(rows, { onConflict: "key" });

  revalidatePublicPages();
}

export async function regenerateWeeklyInsight() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const insight = await generateWeeklyInsight();
  await saveWeeklyInsight(admin.supabase, insight);

  revalidatePublicPages();
}
