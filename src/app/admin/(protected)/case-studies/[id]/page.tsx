import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseStudyForm } from "../case-study-form";

export default async function EditCaseStudyPage({
  params,
}: PageProps<"/admin/case-studies/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: caseStudy } = await supabase
    .from("case_studies")
    .select("id, title, summary, problem, approach, outcome, stack, project_url, published")
    .eq("id", id)
    .maybeSingle();

  if (!caseStudy) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Edit case study</h1>
      <div className="mt-6">
        <CaseStudyForm caseStudy={caseStudy} />
      </div>
    </div>
  );
}
