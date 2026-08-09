"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { parseStats } from "@/lib/parse-stats";
import { logContentChange } from "@/lib/audit-log";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function saveCaseStudy(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") ?? "").trim();
  const published = formData.get("published") === "on";
  const publishAtRaw = String(formData.get("publish_at") ?? "").trim();
  const publishAt = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

  const payload = {
    title,
    slug: slugify(title),
    summary: String(formData.get("summary") ?? "").trim() || null,
    problem: String(formData.get("problem") ?? "").trim() || null,
    approach: String(formData.get("approach") ?? "").trim() || null,
    outcome: String(formData.get("outcome") ?? "").trim() || null,
    stack: String(formData.get("stack") ?? "").trim() || null,
    stats: parseStats(String(formData.get("stats_input") ?? "")),
    project_url: String(formData.get("project_url") ?? "").trim() || null,
    published,
    published_at: published ? publishAt || new Date().toISOString() : null,
    publish_at: publishAt,
    updated_at: new Date().toISOString(),
  };

  let caseStudyId = id;
  if (id) {
    await admin.supabase.from("case_studies").update(payload).eq("id", id);
  } else {
    const { data } = await admin.supabase
      .from("case_studies")
      .insert(payload)
      .select("id")
      .single();
    caseStudyId = data?.id ?? null;
  }

  await logContentChange({
    source: "admin_ui",
    action: id ? "case_study.update" : "case_study.create",
    entity_type: "case_study",
    entity_id: caseStudyId,
    summary: `${id ? "Updated" : "Created"} "${title}"${published ? " (published)" : ""}`,
  });

  revalidatePath("/admin/case-studies");
  revalidatePath("/case-studies");
  redirect("/admin/case-studies");
}

export async function deleteCaseStudy(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const id = formData.get("id") as string;
  const { data: existing } = await admin.supabase
    .from("case_studies")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  await admin.supabase.from("case_studies").delete().eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "case_study.delete",
    entity_type: "case_study",
    entity_id: id,
    summary: `Deleted "${existing?.title ?? id}"`,
  });

  revalidatePath("/admin/case-studies");
  revalidatePath("/case-studies");
  redirect("/admin/case-studies");
}
