import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRelatedContent } from "@/lib/related-content";
import { liveFilter } from "@/lib/publish-filter";
import { extractHeadings, renderMarkdownWithHeadingIds } from "@/lib/markdown";

export const revalidate = 60;

const SELECT =
  "id, title, body_markdown, cover_image_url, tags, reading_minutes, published_at, published, preview_token, series, series_order";

export default async function WritingPostPage({
  params,
  searchParams,
}: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();

  let { data: post } = await supabase
    .from("posts")
    .select(SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .or(liveFilter())
    .maybeSingle();

  let isPreview = false;
  if (!post && typeof preview === "string" && preview) {
    const { data: draft } = await supabase
      .from("posts")
      .select(SELECT)
      .eq("slug", slug)
      .eq("preview_token", preview)
      .maybeSingle();
    if (draft) {
      post = draft;
      isPreview = true;
    }
  }

  if (!post) notFound();

  const [html, related, seriesPosts] = await Promise.all([
    renderMarkdownWithHeadingIds(post.body_markdown),
    isPreview ? Promise.resolve([]) : getRelatedContent("post", post.id),
    post.series && !isPreview
      ? supabase
          .from("posts")
          .select("slug, title, series_order")
          .eq("series", post.series)
          .eq("published", true)
          .or(liveFilter())
          .order("series_order", { ascending: true })
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);
  const headings = extractHeadings(post.body_markdown);
  const seriesIndex = seriesPosts.findIndex((p) => p.slug === slug);
  const seriesPrev = seriesIndex > 0 ? seriesPosts[seriesIndex - 1] : null;
  const seriesNext =
    seriesIndex >= 0 && seriesIndex < seriesPosts.length - 1 ? seriesPosts[seriesIndex + 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.published_at ?? undefined,
    dateModified: post.published_at ?? undefined,
    url: `https://damienkedwards.tech/writing/${slug}`,
    author: { "@type": "Person", name: "Damien Edwards" },
  };

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {isPreview && (
        <p className="mb-4 inline-block rounded-sm border border-rust bg-surface px-3 py-1.5 text-xs font-semibold text-rust">
          Draft preview — not publicly visible yet
        </p>
      )}
      {post.published_at && (
        <p className="font-data text-[11.5px] text-muted">
          {new Date(post.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {" · "}
          {post.reading_minutes} min read
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl">{post.title}</h1>
      {post.tags && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag: string) => (
            <Link
              key={tag}
              href={`/writing?tag=${encodeURIComponent(tag)}`}
              className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted hover:text-teal"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
      {post.series && seriesPosts.length > 1 && (
        <div className="mt-6 rounded-sm border border-line bg-surface px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            {post.series} — Part {seriesIndex + 1} of {seriesPosts.length}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3 text-[13.5px]">
            {seriesPrev ? (
              <Link href={`/writing/${seriesPrev.slug}`} className="text-teal hover:underline">
                ← {seriesPrev.title}
              </Link>
            ) : (
              <span />
            )}
            {seriesNext && (
              <Link href={`/writing/${seriesNext.slug}`} className="text-teal hover:underline">
                {seriesNext.title} →
              </Link>
            )}
          </div>
        </div>
      )}
      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded image, not worth remotePatterns config
        <img
          src={post.cover_image_url}
          alt=""
          className="mt-6 max-h-[420px] w-full rounded-sm border border-line object-cover"
        />
      )}
      {headings.length > 1 && (
        <nav className="mt-8 rounded-sm border border-line bg-surface p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">Contents</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {headings.map((h) => (
              <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                <a href={`#${h.id}`} className="text-muted hover:text-teal">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div
        className="prose prose-neutral mt-8 max-w-[65ch] text-[15.5px] leading-relaxed [&_a]:text-teal [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_h3]:font-display [&_h3]:text-lg [&_h3]:mt-6 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {related.length > 0 && (
        <div className="mt-14 border-t border-line pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Related
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {related.map((r) => (
              <li key={r.url_path + r.title}>
                <Link href={r.url_path} className="text-[15px] hover:text-teal">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
