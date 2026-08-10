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
  uncharted_heading: "Uncharted",
  uncharted_body: "to see project work, including the Arcade game",
  hermes_activity_label: "Last published by Damien's agent that runs the site —",
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
  chat_enabled: "true",
  chat_header: "Ask about Damien's work",
  chat_subheader: "Answers from published posts & case studies",
  chat_example_question: "What kind of AI projects has Damien worked on?",
  newsletter_capture_enabled: "false",
  newsletter_sending_enabled: "false",
  newsletter_from_email: "",
  testimonials_enabled: "false",
  business_inquiry_enabled: "false",
  business_inquiry_intro:
    "A few extra details up front help me get back to you with something useful instead of a round of clarifying questions.",
  how_it_works_intro:
    "Most of the words on this site were typed by a person. A growing share of them weren't — a handful of Claude-powered agents write and publish here directly, through the same front door as everything else. This page is the map: where content comes from, what happens to it on the way in, and how it gets found again.",
  how_it_works_sources:
    "Site Agent | A Telegram bot (@dames81_bot) with full write access — posts, build log entries, site copy — over a plain HTTP endpoint. The \"Last published by...\" label in the homepage's status bar started as a hardcoded string; a Telegram message rewrote it live, no redeploy.\n" +
    "Admin Agent | A second, separate Telegram bot behind a webhook. Narrower tool set, and only replies to one allowlisted chat — anyone else is silently ignored.\n" +
    "MCP clients | Claude Desktop, Claude Code, or any other MCP-speaking tool, connected straight to this site's own MCP server.\n" +
    "Scheduled agents | A research-and-draft agent, a GitHub activity digest, a content-health checker, and a weekly note generator — each a bounded Claude tool loop.\n" +
    "Admin UI | Damien, signed in at /admin — the fallback for anything the agents above don't do, like image uploads or deleting things.",
  how_it_works_surfaces:
    "Public pages | Server-rendered straight from Postgres — no build-time regeneration needed to go live.\n" +
    "Chat widget | pgvector search feeds Claude only what's actually published; answers are grounded and cited, never hallucinated.\n" +
    "/search | The same semantic search as the chat widget, as a plain results page.\n" +
    "MCP server | The same search, plus availability and build-log stats, exposed as tools any MCP client can call — no auth needed for the public tier.\n" +
    "Feeds | /llms.txt, /sitemap.xml, two RSS feeds, and /openapi.json — for the visitors that don't run JS.",
  how_it_works_stack:
    "Next.js 16 (App Router, Vercel)\n" +
    "Supabase — Postgres + pgvector\n" +
    "Anthropic Claude — agents, chat, weekly note\n" +
    "Voyage AI — embeddings\n" +
    "Telegram Bot API\n" +
    "GitHub REST API\n" +
    "Resend — transactional email",
  how_it_works_related_body:
    "Not part of this site's own architecture above, but built the same way — a standalone repo with a real ingest → dbt → semantic layer → BI pipeline over my own GitHub activity, deliberately decoupled from damienkedwardstech's codebase.",
  how_it_works_related_link_title: "A dbt Semantic Layer Over My Own GitHub Activity",
  how_it_works_related_link_slug: "a-dbt-semantic-layer-over-my-own-github-activity",
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
