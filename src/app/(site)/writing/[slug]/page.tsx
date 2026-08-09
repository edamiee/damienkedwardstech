import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/server";
import { getRelatedContent } from "@/lib/related-content";
import { liveFilter } from "@/lib/publish-filter";

export const revalidate = 60;

const SELECT =
  "id, title, body_markdown, cover_image_url, tags, reading_minutes, published_at, published, preview_token";

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

  const [html, related] = await Promise.all([
    marked.parse(post.body_markdown),
    isPreview ? Promise.resolve([]) : getRelatedContent("post", post.id),
  ]);

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
      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded image, not worth remotePatterns config
        <img
          src={post.cover_image_url}
          alt=""
          className="mt-6 max-h-[420px] w-full rounded-sm border border-line object-cover"
        />
      )}
      <div
        className="prose prose-neutral mt-8 max-w-[65ch] text-[15.5px] leading-relaxed [&_a]:text-teal [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
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
