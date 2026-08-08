import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Editable copy for the homepage, About page, footer, and contact page,
// stored in public.site_content as plain key/value rows. Falls back to
// these defaults for any key that hasn't been set yet in /admin/content,
// so the site never shows blank sections.
export const SITE_CONTENT_DEFAULTS = {
  site_name: "Damien K. Edwards",
  home_eyebrow: "Field notes from the data terrain",
  home_heading: "Charting the ground between raw data and working AI systems.",
  home_subheading:
    "I'm Damien Edwards, a freelance AI & data engineer — data pipelines, LLM integrations, and the applied AI features built on top of them. Available for contract and full-time engagements.",
  now_line: "",
  weekly_ai_insight:
    "Checks back every Monday — this note is written fresh each week by Claude and hasn't run yet.",
  about_body:
    "I'm Damien Edwards, an AI and data engineer. I build the pipelines that move and shape data, and the AI-powered features that sit on top of it — the parts a business actually depends on, not just a demo.\n\nReplace this paragraph with your real background: past roles, industries you've worked in, the kind of problems you're best at, and what you're looking for next (contract, freelance, full-time — or all three).",
  about_skills:
    "Data pipelines, Python, TypeScript / Next.js, Supabase / Postgres, Claude / LLM integration, ETL & orchestration",
  resume_url: "",
  footer_tagline: "Surveyed with care",
  contact_intro:
    "Open to freelance and contract AI/data engineering work, and to full-time roles. The fastest way to reach me is email.",
  contact_email: "damien.k.edwards@gmail.com",
  contact_linkedin: "",
  projects_github_url: "",
  chat_enabled: "true",
  chat_header: "Ask about Damien's work",
  chat_subheader: "Answers from published posts & case studies",
  chat_example_question: "What kind of AI projects has Damien worked on?",
} satisfies Record<string, string>;

export type SiteContentKey = keyof typeof SITE_CONTENT_DEFAULTS;

export const getSiteContent = cache(
  async (): Promise<Record<SiteContentKey, string>> => {
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
);

// Lightweight lookup for root layout metadata (browser tab title). Uses the
// admin client rather than getSiteContent()'s cookie-aware one so reading it
// doesn't force every route in the app — including /admin/login and
// /projects/login — into dynamic (non-prerenderable) rendering just to show
// a title. site_name is public content either way.
export const getSiteName = cache(async (): Promise<string> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "site_name")
    .maybeSingle();

  return data?.value || SITE_CONTENT_DEFAULTS.site_name;
});
