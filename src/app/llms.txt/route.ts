import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteContent } from "@/lib/site-content";
import { liveFilter } from "@/lib/publish-filter";

const BASE_URL = "https://damienkedwards.tech";

// Plain-text overview for AI agents/crawlers (the emerging llms.txt
// convention) — a map of what this site is and where its real content
// lives, so an LLM doesn't have to render JS or guess at routes.
export async function GET() {
  const supabase = createAdminClient();
  const content = await getSiteContent();

  const [{ data: posts }, { data: papers }, { data: caseStudies }] = await Promise.all([
    supabase
      .from("posts")
      .select("title, slug, excerpt, published_at")
      .eq("published", true)
      .or(liveFilter())
      .order("published_at", { ascending: false }),
    supabase
      .from("papers")
      .select("title, url, description")
      .eq("published", true),
    supabase
      .from("case_studies")
      .select("title, slug, summary")
      .eq("published", true)
      .or(liveFilter())
      .order("sort_order", { ascending: true }),
  ]);

  const lines: string[] = [];
  lines.push(`# ${content.site_name}`);
  lines.push("");
  lines.push(`> ${content.home_subheading}`);
  lines.push("");
  lines.push(content.about_body.split("\n")[0]);
  lines.push("");

  lines.push("## Writing");
  for (const post of posts ?? []) {
    const desc = post.excerpt ? ` — ${post.excerpt}` : "";
    lines.push(`- [${post.title}](${BASE_URL}/writing/${post.slug})${desc}`);
  }
  if (!posts?.length) lines.push("(nothing published yet)");
  lines.push("");

  lines.push("## Build log");
  for (const cs of caseStudies ?? []) {
    const desc = cs.summary ? ` — ${cs.summary}` : "";
    lines.push(`- [${cs.title}](${BASE_URL}/build-log/${cs.slug})${desc}`);
  }
  if (!caseStudies?.length) lines.push("(nothing published yet)");
  lines.push("");

  lines.push("## Papers / external writing");
  for (const paper of papers ?? []) {
    const desc = paper.description ? ` — ${paper.description}` : "";
    lines.push(`- [${paper.title}](${paper.url})${desc}`);
  }
  if (!papers?.length) lines.push("(nothing published yet)");
  lines.push("");

  lines.push("## Contact");
  lines.push(`- Email: ${content.contact_email}`);
  if (content.contact_linkedin) lines.push(`- LinkedIn: ${content.contact_linkedin}`);
  lines.push(`- Contact page: ${BASE_URL}/contact`);
  lines.push("");
  lines.push(`How this site is built (agents, MCP, audit log): ${BASE_URL}/how-it-works`);
  lines.push(`Full site map: ${BASE_URL}/sitemap.xml`);
  lines.push(`API spec (what an agent can *do* here, not just read): ${BASE_URL}/openapi.json`);
  lines.push(`MCP server (same tools, for MCP clients): ${BASE_URL}/api/mcp`);

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
