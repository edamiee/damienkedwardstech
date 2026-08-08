import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function WritingPostPage({
  params,
}: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, body_markdown, published_at, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!post) notFound();

  const html = await marked.parse(post.body_markdown);

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
      {post.published_at && (
        <p className="font-data text-[11.5px] text-muted">
          {new Date(post.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl">{post.title}</h1>
      <div
        className="prose prose-neutral mt-8 max-w-[65ch] text-[15.5px] leading-relaxed [&_a]:text-teal [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-8 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
