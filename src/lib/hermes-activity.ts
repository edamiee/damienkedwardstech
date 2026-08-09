import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { liveFilter } from "@/lib/publish-filter";

export type HermesActivity = {
  title: string;
  href: string;
  updatedAt: string;
};

const AGENT_SOURCES = ["hermes", "agent"];

// Most recently published post or case study that came from the content
// API (i.e. Hermes or another agent), not hand-edited in /admin — used for
// the homepage's "Last published by Hermes" line. Returns null rather than
// a placeholder if nothing agent-sourced has been published yet.
export const getLatestHermesActivity = cache(async (): Promise<HermesActivity | null> => {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: caseStudies }] = await Promise.all([
    supabase
      .from("posts")
      .select("title, slug, updated_at")
      .eq("published", true)
      .or(liveFilter())
      .in("source", AGENT_SOURCES)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("case_studies")
      .select("title, slug, updated_at")
      .eq("published", true)
      .or(liveFilter())
      .in("source", AGENT_SOURCES)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const candidates: HermesActivity[] = [
    ...(posts ?? []).map((p) => ({
      title: p.title,
      href: `/writing/${p.slug}`,
      updatedAt: p.updated_at as string,
    })),
    ...(caseStudies ?? []).map((cs) => ({
      title: cs.title,
      href: `/case-studies/${cs.slug}`,
      updatedAt: cs.updated_at as string,
    })),
  ];

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
});
