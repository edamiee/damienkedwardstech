import { XMLParser } from "fast-xml-parser";

// Pulls recent posts from a couple of real AI research/industry blogs —
// no API key, no paid news service. Each feed is fetched independently so
// one going down doesn't take the whole section with it.
const FEEDS = [
  { url: "https://openai.com/blog/rss.xml", source: "OpenAI" },
  { url: "https://deepmind.google/blog/rss.xml", source: "Google DeepMind" },
];

export type AiNewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
};

const parser = new XMLParser({ ignoreAttributes: false });

function unwrapCdata(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<AiNewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: 3600 },
      headers: { "user-agent": "damienkedwards.tech-feed-reader" },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];

    return list.slice(0, 5).map((item: Record<string, unknown>) => ({
      title: unwrapCdata(item.title),
      link: unwrapCdata(item.link),
      source: feed.source,
      publishedAt: unwrapCdata(item.pubDate) || null,
    }));
  } catch {
    return [];
  }
}

export async function getLatestAiNews(limit = 5): Promise<AiNewsItem[]> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  return results
    .flat()
    .filter((item) => item.title && item.link)
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}
