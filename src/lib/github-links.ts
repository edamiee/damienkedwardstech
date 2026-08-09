import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type GithubLink = { id: string; label: string; url: string };

export const getGithubLinks = cache(async (): Promise<GithubLink[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("github_links")
    .select("id, label, url")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
});
