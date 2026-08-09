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

// RSS 2.0 feed of published posts — rather than Atom, since RSS has the
// widest reader support for a small personal blog like this one.
export async function GET() {
  const supabase = createAdminClient();
  const content = await getSiteContent();

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, published_at")
    .eq("published", true)
    .or(liveFilter())
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts ?? [])
    .map((post) => {
      const link = `${BASE_URL}/writing/${post.slug}`;
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : undefined;
      return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ""}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(content.site_name)} — Writing</title>
  <link>${BASE_URL}/writing</link>
  <description>${escapeXml(content.home_subheading)}</description>
  <language>en-us</language>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
