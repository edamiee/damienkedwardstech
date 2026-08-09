import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type HealthIssue = { type: string; title: string; detail: string; href: string };

async function checkLink(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      // Some servers don't support HEAD — retry with GET before giving up.
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// Read-only maintenance scan, computed fresh on every visit rather than
// stored — reports issues for a human to fix, never edits anything itself.
export async function runContentHealthCheck(): Promise<HealthIssue[]> {
  const supabase = createAdminClient();
  const issues: HealthIssue[] = [];

  const [{ data: caseStudies }, { data: posts }] = await Promise.all([
    supabase
      .from("case_studies")
      .select("id, title, project_url, stats")
      .eq("published", true),
    supabase.from("posts").select("id, title, tags").eq("published", true),
  ]);

  const withUrls = (caseStudies ?? []).filter((cs) => cs.project_url);
  const linkResults = await Promise.all(withUrls.map((cs) => checkLink(cs.project_url as string)));
  withUrls.forEach((cs, i) => {
    if (!linkResults[i]) {
      issues.push({
        type: "Broken link",
        title: cs.title,
        detail: `Project link didn't respond OK: ${cs.project_url}`,
        href: `/admin/case-studies/${cs.id}`,
      });
    }
  });

  for (const cs of caseStudies ?? []) {
    if (((cs.stats ?? []) as unknown[]).length === 0) {
      issues.push({
        type: "No impact stats",
        title: cs.title,
        detail: "No stats recorded — consider adding a pull-quote number.",
        href: `/admin/case-studies/${cs.id}`,
      });
    }
  }

  for (const post of posts ?? []) {
    if (((post.tags ?? []) as string[]).length === 0) {
      issues.push({
        type: "No tags",
        title: post.title,
        detail: "No tags set, so it won't show up under any topic filter.",
        href: `/admin/posts/${post.id}`,
      });
    }
  }

  return issues;
}
