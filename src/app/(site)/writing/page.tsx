import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { liveFilter } from "@/lib/publish-filter";

export const revalidate = 60;

type WritingItem = {
  kind: "post" | "paper";
  title: string;
  blurb: string | null;
  date: string | null;
  href: string;
  external: boolean;
  coverImageUrl: string | null;
  tags: string[];
  readingMinutes: number | null;
};

export default async function WritingIndexPage({ searchParams }: PageProps<"/writing">) {
  const { tag } = await searchParams;
  const activeTag = typeof tag === "string" ? tag : null;

  const supabase = await createClient();

  const [{ data: posts }, { data: papers }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, title, excerpt, cover_image_url, tags, reading_minutes, published_at")
      .eq("published", true)
      .or(liveFilter()),
    supabase
      .from("papers")
      .select("slug, title, description, url, published_at")
      .eq("published", true),
  ]);

  const allItems: WritingItem[] = [
    ...(posts ?? []).map((post) => ({
      kind: "post" as const,
      title: post.title,
      blurb: post.excerpt,
      date: post.published_at,
      href: `/writing/${post.slug}`,
      external: false,
      coverImageUrl: post.cover_image_url,
      tags: post.tags ?? [],
      readingMinutes: post.reading_minutes,
    })),
    ...(papers ?? []).map((paper) => ({
      kind: "paper" as const,
      title: paper.title,
      blurb: paper.description,
      date: paper.published_at,
      href: paper.url,
      external: true,
      coverImageUrl: null,
      tags: [],
      readingMinutes: null,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const allTags = Array.from(new Set(allItems.flatMap((i) => i.tags))).sort();
  const items = activeTag ? allItems.filter((i) => i.tags.includes(activeTag)) : allItems;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl">Writing</h1>
        <a
          href="/feed.xml"
          className="whitespace-nowrap font-data text-[11.5px] text-muted hover:text-teal"
        >
          RSS ↗
        </a>
      </div>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Posts written here, and longer documents — research notes, guides —
        linked out from wherever they&apos;re hosted.
      </p>

      {allTags.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {allTags.map((t) => (
            <Link
              key={t}
              href={t === activeTag ? "/writing" : `/writing?tag=${encodeURIComponent(t)}`}
              className={`rounded-sm border px-2.5 py-1 text-[11.5px] ${
                t === activeTag
                  ? "border-teal bg-teal text-ground"
                  : "border-line bg-surface text-muted hover:text-teal"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      <ul className="mt-10 divide-y divide-line">
        {items.map((item) => (
          <li key={item.href} className="py-5">
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="group flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-4">
                {item.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded image, not worth remotePatterns config
                  <img
                    src={item.coverImageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-sm border border-line object-cover"
                  />
                )}
                <span>
                  <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">
                    {item.kind === "post" ? "Post" : "Document"}
                  </span>
                  <span className="mt-1 block font-display text-lg group-hover:text-teal">
                    {item.title}
                  </span>
                  {item.blurb && (
                    <span className="mt-1 block text-sm text-muted">{item.blurb}</span>
                  )}
                  {item.tags.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-sm bg-surface px-1.5 py-0.5 text-[10.5px] text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </span>
              <span className="whitespace-nowrap font-data text-[11.5px] text-muted">
                {item.external ? "↗ " : ""}
                {item.date &&
                  new Date(item.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                  })}
                {item.readingMinutes && ` · ${item.readingMinutes} min`}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-5 text-sm text-muted">
            {activeTag ? `Nothing tagged "${activeTag}" yet.` : "Nothing published yet — check back soon."}
          </li>
        )}
      </ul>
    </div>
  );
}
