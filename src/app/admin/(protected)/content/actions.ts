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

// Checkboxes post "on" when checked and nothing at all when unchecked,
// unlike the free-text fields this form otherwise loops over generically —
// so these keys need their own true/false mapping.
const CHECKBOX_KEYS: SiteContentKey[] = [
  "chat_enabled",
  "newsletter_capture_enabled",
  "newsletter_sending_enabled",
  "testimonials_enabled",
];

export async function saveSiteContent(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const keys = Object.keys(SITE_CONTENT_DEFAULTS) as SiteContentKey[];
  const rows = keys.map((key) => ({
    key,
    value: CHECKBOX_KEYS.includes(key)
      ? formData.get(key) === "on"
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
