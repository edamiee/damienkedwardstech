import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SiteIndexItem = { id: string; title: string; href: string; kind: string };

const STATIC_PAGES: SiteIndexItem[] = [
  { id: "page-home", title: "Home", href: "/", kind: "Page" },
  { id: "page-about", title: "About", href: "/about", kind: "Page" },
  { id: "page-writing", title: "Writing", href: "/writing", kind: "Page" },
  { id: "page-case-studies", title: "Case studies", href: "/case-studies", kind: "Page" },
  { id: "page-projects", title: "Projects (sign in)", href: "/projects", kind: "Page" },
  { id: "page-contact", title: "Contact", href: "/contact", kind: "Page" },
  { id: "page-search", title: "Search", href: "/search", kind: "Page" },
];

// Flat, lightweight list for the client-side command palette (Cmd+K) —
// titles and links only, no bodies, so it's cheap to ship to the browser
// and filter on every keystroke.
export const getSiteIndex = cache(async (): Promise<SiteIndexItem[]> => {
  const supabase = await createClient();
  const [{ data: posts }, { data: caseStudies }, { data: papers }] = await Promise.all([
    supabase.from("posts").select("id, title, slug").eq("published", true),
    supabase.from("case_studies").select("id, title, slug").eq("published", true),
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
      href: `/case-studies/${c.slug}`,
      kind: "Case study",
    })),
    ...(papers ?? []).map((p) => ({
      id: `paper-${p.id}`,
      title: p.title,
      href: p.url,
      kind: "Document",
    })),
  ];
});
