import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuildLogForm } from "../build-log-form";

export default async function EditBuildLogEntryPage({
  params,
}: PageProps<"/admin/build-log/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: caseStudy } = await supabase
    .from("case_studies")
    .select(
      "id, slug, title, summary, problem, approach, outcome, stack, stats, project_url, published, publish_at, preview_token"
    )
    .eq("id", id)
    .maybeSingle();

  if (!caseStudy) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Edit build log entry</h1>
      <div className="mt-6">
        <BuildLogForm caseStudy={caseStudy} />
      </div>
    </div>
  );
}
