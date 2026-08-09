import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCaseStudiesPage() {
  const supabase = await createClient();
  const { data: caseStudies } = await supabase
    .from("case_studies")
    .select("id, title, published")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Case studies</h1>
        <Link
          href="/admin/case-studies/new"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground"
        >
          New case study
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Structured project writeups — problem, approach, outcome. Shown
        publicly at /case-studies, no login required.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {(caseStudies ?? []).map((cs) => (
          <li key={cs.id} className="flex items-center justify-between py-4">
            <Link href={`/admin/case-studies/${cs.id}`} className="font-medium hover:text-teal">
              {cs.title}
            </Link>
            <span className="flex items-center gap-4">
              <span className="text-xs text-muted">
                {cs.published ? "Published" : "Draft"}
              </span>
              <Link href={`/admin/case-studies/${cs.id}`} className="text-sm text-teal">
                Edit
              </Link>
            </span>
          </li>
        ))}
        {(!caseStudies || caseStudies.length === 0) && (
          <li className="py-4 text-sm text-muted">No case studies yet.</li>
        )}
      </ul>
    </div>
  );
}
