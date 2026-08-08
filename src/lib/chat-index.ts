import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedTexts } from "@/lib/voyage";
import { chunkText } from "@/lib/chunk-text";

type EmbeddingRow = {
  source_type: "post" | "paper" | "case_study" | "project";
  source_id: string;
  title: string;
  url_path: string;
  chunk_text: string;
};

const DELETE_ALL_FILTER = "00000000-0000-0000-0000-000000000000";
const EMBED_BATCH = 50; // stays well under Voyage's per-request input limit

// Rebuilds public.content_embeddings from every currently-published post,
// paper, and case study, plus a teaser (name + description only, never the
// URL) for each visible gated project. Run from /admin/chat-index whenever
// content changes — there's no automatic trigger, so a stale index just
// means the chat answers from slightly older content, not broken content.
export async function reindexContentEmbeddings(): Promise<{ chunks: number }> {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: papers }, { data: caseStudies }, { data: projects }] =
    await Promise.all([
      supabase.from("posts").select("id, slug, title, body_markdown").eq("published", true),
      supabase.from("papers").select("id, title, description, url").eq("published", true),
      supabase
        .from("case_studies")
        .select("id, slug, title, summary, problem, approach, outcome")
        .eq("published", true),
      supabase.from("site_projects").select("id, name, description").eq("visible", true),
    ]);

  const rows: EmbeddingRow[] = [];

  for (const post of posts ?? []) {
    for (const chunk of chunkText(post.body_markdown)) {
      rows.push({
        source_type: "post",
        source_id: post.id,
        title: post.title,
        url_path: `/writing/${post.slug}`,
        chunk_text: chunk,
      });
    }
  }

  for (const paper of papers ?? []) {
    const text = [paper.title, paper.description].filter(Boolean).join("\n\n");
    if (text) {
      rows.push({
        source_type: "paper",
        source_id: paper.id,
        title: paper.title,
        url_path: paper.url,
        chunk_text: text,
      });
    }
  }

  for (const cs of caseStudies ?? []) {
    const text = [cs.summary, cs.problem, cs.approach, cs.outcome].filter(Boolean).join("\n\n");
    for (const chunk of chunkText(text)) {
      rows.push({
        source_type: "case_study",
        source_id: cs.id,
        title: cs.title,
        url_path: `/case-studies/${cs.slug}`,
        chunk_text: chunk,
      });
    }
  }

  // Gated projects are teased, not fully indexed: only name + description
  // go in, never the project's real URL, and url_path points at the
  // sign-in-gated /projects listing rather than the project itself — so
  // the chat can say a project exists without handing out its link to
  // anyone who didn't sign in.
  for (const project of projects ?? []) {
    const text = [project.name, project.description].filter(Boolean).join("\n\n");
    if (text) {
      rows.push({
        source_type: "project",
        source_id: project.id,
        title: project.name,
        url_path: "/projects",
        chunk_text: text,
      });
    }
  }

  await supabase.from("content_embeddings").delete().neq("id", DELETE_ALL_FILTER);

  if (rows.length === 0) {
    return { chunks: 0 };
  }

  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const batch = rows.slice(i, i + EMBED_BATCH);
    const embeddings = await embedTexts(
      batch.map((r) => r.chunk_text),
      "document"
    );
    const { error } = await supabase.from("content_embeddings").insert(
      batch.map((r, j) => ({ ...r, embedding: embeddings[j] }))
    );
    if (error) throw new Error(error.message);
  }

  return { chunks: rows.length };
}
