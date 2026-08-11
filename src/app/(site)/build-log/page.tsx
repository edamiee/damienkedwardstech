import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { liveFilter } from "@/lib/publish-filter";
import { getRecentShippedCommits } from "@/lib/github-activity";

export const revalidate = 60;

export default async function BuildLogIndexPage({ searchParams }: PageProps<"/build-log">) {
  const { stack } = await searchParams;
  const activeStack = typeof stack === "string" ? stack : null;

  const supabase = await createClient();
  const [{ data: caseStudies }, recentCommits] = await Promise.all([
    supabase
      .from("case_studies")
      .select("slug, title, summary, stack, published_at")
      .eq("published", true)
      .or(liveFilter())
      .order("sort_order", { ascending: true }),
    getRecentShippedCommits(7),
  ]);

  const withStack = (caseStudies ?? []).map((cs) => ({
    ...cs,
    stackItems: (cs.stack ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean) as string[],
  }));
  const allStackTags = Array.from(new Set(withStack.flatMap((cs) => cs.stackItems))).sort();
  const items = activeStack
    ? withStack.filter((cs) => cs.stackItems.includes(activeStack))
    : withStack;

  const buildHref = (tag: string | null) => (tag ? `/build-log?stack=${encodeURIComponent(tag)}` : "/build-log");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl">Build log</h1>
        <a
          href="/build-log/feed.xml"
          className="whitespace-nowrap font-data text-[11.5px] text-muted hover:text-teal"
        >
          RSS ↗
        </a>
      </div>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Real problems, the approach taken, and what happened — the fuller
        story behind the project list.
      </p>

      {recentCommits.length > 0 && (
        <div className="mt-8 rounded-sm border border-line bg-surface px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            What shipped this week
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {recentCommits.slice(0, 12).map((c, i) => (
              <li
                key={`${c.repo}-${c.date}-${i}`}
                className="flex items-baseline gap-2 font-data text-[12.5px] text-muted"
              >
                <span className="shrink-0 font-semibold text-fg">{c.repo.split("/")[1] ?? c.repo}</span>
                <span className="truncate">{c.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allStackTags.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {allStackTags.map((tag) => (
            <Link
              key={tag}
              href={buildHref(tag === activeStack ? null : tag)}
              className={`rounded-sm border px-2.5 py-1 text-[11.5px] ${
                tag === activeStack
                  ? "border-teal bg-teal text-ground"
                  : "border-line bg-surface text-muted hover:text-teal"
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <ul className="mt-10 divide-y divide-line">
        {items.map((cs) => (
          <li key={cs.slug} className="py-6">
            <Link href={`/build-log/${cs.slug}`} className="group block">
              <span className="font-display text-xl group-hover:text-teal">
                {cs.title}
              </span>
              {cs.summary && (
                <span className="mt-1.5 block max-w-[60ch] text-sm text-muted">
                  {cs.summary}
                </span>
              )}
              {cs.stackItems.length > 0 && (
                <span className="mt-3 flex flex-wrap gap-2">
                  {cs.stackItems.map((item) => (
                    <span
                      key={item}
                      className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted"
                    >
                      {item}
                    </span>
                  ))}
                </span>
              )}
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-6 text-sm text-muted">
            {activeStack
              ? `Nothing tagged "${activeStack}" yet.`
              : "Nothing published yet — check back soon."}
          </li>
        )}
      </ul>
    </div>
  );
}
