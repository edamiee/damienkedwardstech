import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function CaseStudiesIndexPage() {
  const supabase = await createClient();
  const { data: caseStudies } = await supabase
    .from("case_studies")
    .select("slug, title, summary, stack, published_at")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl">Case studies</h1>
      <p className="mt-2 max-w-[55ch] text-sm text-muted">
        Real problems, the approach taken, and what happened — the fuller
        story behind the project list.
      </p>

      <ul className="mt-10 divide-y divide-line">
        {(caseStudies ?? []).map((cs) => {
          const stack: string[] = (cs.stack ?? "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
          return (
            <li key={cs.slug} className="py-6">
              <Link href={`/case-studies/${cs.slug}`} className="group block">
                <span className="font-display text-xl group-hover:text-teal">
                  {cs.title}
                </span>
                {cs.summary && (
                  <span className="mt-1.5 block max-w-[60ch] text-sm text-muted">
                    {cs.summary}
                  </span>
                )}
                {stack.length > 0 && (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {stack.map((item: string) => (
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
          );
        })}
        {(!caseStudies || caseStudies.length === 0) && (
          <li className="py-6 text-sm text-muted">
            Nothing published yet — check back soon.
          </li>
        )}
      </ul>
    </div>
  );
}
