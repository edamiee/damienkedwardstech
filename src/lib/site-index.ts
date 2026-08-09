import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { liveFilter } from "@/lib/publish-filter";

export type SiteIndexItem = { id: string; title: string; href: string; kind: string };

const STATIC_PAGES: SiteIndexItem[] = [
  { id: "page-home", title: "Home", href: "/", kind: "Page" },
  { id: "page-about", title: "About", href: "/about", kind: "Page" },
  { id: "page-writing", title: "Writing", href: "/writing", kind: "Page" },
  { id: "page-build-log", title: "Build log", href: "/build-log", kind: "Page" },
  { id: "page-how-it-works", title: "How this site works", href: "/how-it-works", kind: "Page" },
  { id: "page-projects", title: "Projects (sign in)", href: "/projects", kind: "Page" },
  { id: "page-newsletter", title: "Newsletter archive", href: "/newsletter", kind: "Page" },
  { id: "page-contact", title: "Contact", href: "/contact", kind: "Page" },
  { id: "page-search", title: "Search", href: "/search", kind: "Page" },
];

// Flat, lightweight list for the client-side command palette (Cmd+K) —
// titles and links only, no bodies, so it's cheap to ship to the browser
// and filter on every keystroke.
export const getSiteIndex = cache(async (): Promise<SiteIndexItem[]> => {
  const supabase = await createClient();
  const [{ data: posts }, { data: caseStudies }, { data: papers }] = await Promise.all([
    supabase.from("posts").select("id, title, slug").eq("published", true).or(liveFilter()),
    supabase
      .from("case_studies")
      .select("id, title, slug")
      .eq("published", true)
      .or(liveFilter()),
    supabase.from("papers").select("id, title, url").eq("published", true),
  ]);

  return [
    ...STATIC_PAGES,
    ...(posts ?? []).map((p) => ({
      id: `post-${p.id}`,
      title: p.title,
      href: `/writing/${p.slug}`,
      kind: "Post",
    })),
    ...(caseStudies ?? []).map((c) => ({
      id: `cs-${c.id}`,
      title: c.title,
      href: `/build-log/${c.slug}`,
      kind: "Build log",
    })),
    ...(papers ?? []).map((p) => ({
      id: `paper-${p.id}`,
      title: p.title,
      href: p.url,
      kind: "Document",
    })),
  ];
});
