import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { liveFilter } from "@/lib/publish-filter";

const BASE_URL = "https://damienkedwards.tech";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: caseStudies }] = await Promise.all([
    supabase.from("posts").select("slug, updated_at").eq("published", true).or(liveFilter()),
    supabase
      .from("case_studies")
      .select("slug, updated_at")
      .eq("published", true)
      .or(liveFilter()),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/writing`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/build-log`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${BASE_URL}/writing/${post.slug}`,
    lastModified: post.updated_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const caseStudyRoutes: MetadataRoute.Sitemap = (caseStudies ?? []).map((cs) => ({
    url: `${BASE_URL}/build-log/${cs.slug}`,
    lastModified: cs.updated_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...caseStudyRoutes];
}
