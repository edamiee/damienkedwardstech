import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedFindingBySlug,
  VENDOR_LABELS,
  PATTERN_CATEGORY_LABELS,
} from "@/lib/research-findings";

export const revalidate = 60;

export default async function ResearchFindingPage({ params }: PageProps<"/research/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const finding = await getApprovedFindingBySlug(supabase, slug);

  if (!finding) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: finding.title,
    description: finding.why_it_matters,
    datePublished: finding.found_at,
    url: `https://damienkedwards.tech/research/${slug}`,
    author: { "@type": "Person", name: "Damien Edwards" },
  };

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/research" className="font-data text-[11.5px] text-muted hover:text-teal">
        ← Research
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">
          {VENDOR_LABELS[finding.vendor]}
        </span>
        <span className="text-muted">·</span>
        <span className="font-data text-[10.5px] uppercase tracking-[0.08em] text-muted">
          {PATTERN_CATEGORY_LABELS[finding.pattern_category]}
        </span>
        <span className="text-muted">·</span>
        <span className="font-data text-[10.5px] text-muted">
          {new Date(finding.found_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <h1 className="mt-2 font-display text-3xl">{finding.title}</h1>
      <p className="mt-3 max-w-[60ch] text-[15.5px] text-muted">{finding.why_it_matters}</p>

      {finding.stack_components.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {finding.stack_components.map((item) => (
            <span
              key={item}
              className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-8">
        <section className="border-l-2 border-teal pl-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            What changed
          </h2>
          <p className="mt-2 max-w-[60ch] whitespace-pre-line text-[15.5px] leading-relaxed text-fg">
            {finding.what_changed}
          </p>
        </section>
        <section className="border-l-2 border-teal pl-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            Why it matters
          </h2>
          <p className="mt-2 max-w-[60ch] whitespace-pre-line text-[15.5px] leading-relaxed text-fg">
            {finding.why_it_matters}
          </p>
        </section>
      </div>

      {finding.source_urls.length > 0 && (
        <div className="mt-14 border-t border-line pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">Sources</p>
          <ul className="mt-4 flex flex-col gap-2">
            {finding.source_urls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[13.5px] text-teal hover:underline"
                >
                  {url} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
