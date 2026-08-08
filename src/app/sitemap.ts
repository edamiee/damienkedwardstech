import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://damienkedwards.tech";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: caseStudies }] = await Promise.all([
    supabase.from("posts").select("slug, updated_at").eq("published", true),
    supabase.from("case_studies").select("slug, updated_at").eq("published", true),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/writing`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/case-studies`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${BASE_URL}/writing/${post.slug}`,
    lastModified: post.updated_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const caseStudyRoutes: MetadataRoute.Sitemap = (caseStudies ?? []).map((cs) => ({
    url: `${BASE_URL}/case-studies/${cs.slug}`,
    lastModified: cs.updated_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...caseStudyRoutes];
}
