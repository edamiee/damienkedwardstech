import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRelatedContent } from "@/lib/related-content";

export const revalidate = 60;

export default async function CaseStudyPage({
  params,
}: PageProps<"/case-studies/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: cs } = await supabase
    .from("case_studies")
    .select(
      "id, title, summary, problem, approach, outcome, stack, project_url, published_at, published"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!cs) notFound();

  const related = await getRelatedContent("case_study", cs.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: cs.title,
    description: cs.summary ?? undefined,
    datePublished: cs.published_at ?? undefined,
    url: `https://damienkedwards.tech/case-studies/${slug}`,
    author: { "@type": "Person", name: "Damien Edwards" },
  };

  const stack: string[] = (cs.stack ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const sections: { label: string; body: string | null }[] = [
    { label: "Problem", body: cs.problem },
    { label: "Approach", body: cs.approach },
    { label: "Outcome", body: cs.outcome },
  ].filter((s) => s.body);

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {cs.published_at && (
        <p className="font-data text-[11.5px] text-muted">
          {new Date(cs.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl">{cs.title}</h1>
      {cs.summary && (
        <p className="mt-3 max-w-[60ch] text-[15.5px] text-muted">{cs.summary}</p>
      )}

      {stack.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stack.map((item: string) => (
            <span
              key={item}
              className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {cs.project_url && (
        <a
          href={cs.project_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-bg"
        >
          View project ↗
        </a>
      )}

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.label} className="border-l-2 border-teal pl-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
              {section.label}
            </h2>
            <p className="mt-2 max-w-[60ch] whitespace-pre-line text-[15.5px] leading-relaxed text-fg">
              {section.body}
            </p>
          </section>
        ))}
      </div>

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
