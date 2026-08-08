import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type NavLink = { id: string; label: string; href: string };

// Matches the seed rows in 0003_nav_and_home_sections.sql — used if the
// table is ever empty (e.g. local dev before running migrations) so the
// header never renders with no links at all.
const FALLBACK: NavLink[] = [
  { id: "about", label: "About", href: "/about" },
  { id: "writing", label: "Writing", href: "/writing" },
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "contact", label: "Contact", href: "/contact" },
];

export const getNavLinks = cache(async (): Promise<NavLink[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nav_links")
    .select("id, label, href")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  return data && data.length > 0 ? data : FALLBACK;
});
