import { createClient } from "@/lib/supabase/server";

// Editable copy for the homepage hero and About page, stored in
// public.site_content as plain key/value rows. Falls back to these
// defaults for any key that hasn't been set yet in /admin/content, so the
// site never shows blank sections.
export const SITE_CONTENT_DEFAULTS = {
  home_eyebrow: "Field notes from the data terrain",
  home_heading: "Charting the ground between raw data and working AI systems.",
  home_subheading:
    "I'm Damien Edwards, a freelance AI & data engineer — data pipelines, LLM integrations, and the applied AI features built on top of them. Available for contract and full-time engagements.",
  about_body:
    "I'm Damien Edwards, an AI and data engineer. I build the pipelines that move and shape data, and the AI-powered features that sit on top of it — the parts a business actually depends on, not just a demo.\n\nReplace this paragraph with your real background: past roles, industries you've worked in, the kind of problems you're best at, and what you're looking for next (contract, freelance, full-time — or all three).",
  about_skills:
    "Data pipelines, Python, TypeScript / Next.js, Supabase / Postgres, Claude / LLM integration, ETL & orchestration",
} satisfies Record<string, string>;

export type SiteContentKey = keyof typeof SITE_CONTENT_DEFAULTS;

export async function getSiteContent(): Promise<Record<SiteContentKey, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value");

  const result = { ...SITE_CONTENT_DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in result && row.value) {
      result[row.key as SiteContentKey] = row.value;
    }
  }
  return result;
}
