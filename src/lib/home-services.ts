import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type HomeService = { id: string; title: string; body: string };

// Matches the seed rows in 0003_nav_and_home_sections.sql.
const FALLBACK: HomeService[] = [
  {
    id: "pipelines",
    title: "Data pipelines",
    body: "Ingestion, transformation, and orchestration that hold up under real production load.",
  },
  {
    id: "llm",
    title: "LLM integration",
    body: "Wiring Claude and other models into products as features, not demos.",
  },
  {
    id: "features",
    title: "Applied AI features",
    body: "The interface layer on top — the part your users and customers actually touch.",
  },
];

export const getHomeServices = cache(async (): Promise<HomeService[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("home_services")
    .select("id, title, body")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  return data && data.length > 0 ? data : FALLBACK;
});
