import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteContent } from "@/lib/site-content";
import { liveFilter } from "@/lib/publish-filter";

const BASE_URL = "https://damienkedwards.tech";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS 2.0 feed of the build log — separate from /feed.xml (posts) since
// it's a distinct content type someone might want to follow on its own.
export async function GET() {
  const supabase = createAdminClient();
  const content = await getSiteContent();

  const { data: caseStudies } = await supabase
    .from("case_studies")
    .select("title, slug, summary, published_at")
    .eq("published", true)
    .or(liveFilter())
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (caseStudies ?? [])
    .map((cs) => {
      const link = `${BASE_URL}/build-log/${cs.slug}`;
      const pubDate = cs.published_at ? new Date(cs.published_at).toUTCString() : undefined;
      return `  <item>
    <title>${escapeXml(cs.title)}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    ${cs.summary ? `<description>${escapeXml(cs.summary)}</description>` : ""}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(content.site_name)} — Build log</title>
  <link>${BASE_URL}/build-log</link>
  <description>${escapeXml(content.home_subheading)}</description>
  <language>en-us</language>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
