import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type WritingItem = {
  kind: "post" | "paper";
  title: string;
  blurb: string | null;
  date: string | null;
  href: string;
  external: boolean;
};

export default async function WritingIndexPage() {
  const supabase = await createClient();

  const [{ data: posts }, { data: papers }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, title, excerpt, published_at")
      .eq("published", true),
    supabase
      .from("papers")
      .select("slug, title, description, url, published_at")
      .eq("published", true),
  ]);

  const items: WritingItem[] = [
    ...(posts ?? []).map((post) => ({
      kind: "post" as const,
      title: post.title,
      blurb: post.excerpt,
      date: post.published_at,
      href: `/writing/${post.slug}`,
      external: false,
    })),
    ...(papers ?? []).map((paper) => ({
      kind: "paper" as const,
      title: paper.title,
      blurb: paper.description,
      date: paper.published_at,
      href: paper.url,
      external: true,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Writing</h1>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Posts written here, and longer documents — writeups, case studies,
        research notes — linked out from wherever they&apos;re hosted.
      </p>

      <ul className="mt-10 divide-y divide-line">
        {items.map((item) => (
          <li key={item.href} className="py-5">
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="group flex items-baseline justify-between gap-4"
            >
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
              </span>
              <span className="whitespace-nowrap font-data text-[11.5px] text-muted">
                {item.external ? "↗ " : ""}
                {item.date &&
                  new Date(item.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                  })}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-5 text-sm text-muted">Nothing published yet — check back soon.</li>
        )}
      </ul>
    </div>
  );
}
