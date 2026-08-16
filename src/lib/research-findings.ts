import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logContentChange } from "@/lib/audit-log";
import { embedOne } from "@/lib/voyage";

export const VENDORS = [
  "snowflake",
  "databricks",
  "dbt",
  "spark",
  "qlik",
  "redshift",
  "fabric",
  "n8n",
] as const;
export type Vendor = (typeof VENDORS)[number];

export const VENDOR_LABELS: Record<Vendor, string> = {
  snowflake: "Snowflake",
  databricks: "Databricks",
  dbt: "dbt",
  spark: "Spark",
  qlik: "Qlik",
  redshift: "Redshift",
  fabric: "MS Fabric",
  n8n: "n8n",
};

export const PATTERN_CATEGORIES = [
  "incremental_modeling",
  "semantic_layer",
  "orchestration",
  "cost_optimization",
  "storage_format",
  "query_engine",
  "governance",
  "other",
] as const;
export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

export const PATTERN_CATEGORY_LABELS: Record<PatternCategory, string> = {
  incremental_modeling: "Incremental modeling",
  semantic_layer: "Semantic layer",
  orchestration: "Orchestration",
  cost_optimization: "Cost optimization",
  storage_format: "Storage format",
  query_engine: "Query engine",
  governance: "Governance",
  other: "Other",
};

export const DISCARD_REASONS = [
  "already_covered",
  "too_marketing",
  "too_niche",
  "wrong_category",
  "not_interesting",
] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  already_covered: "Already covered",
  too_marketing: "Too marketing",
  too_niche: "Too niche",
  wrong_category: "Wrong category",
  not_interesting: "Not interesting",
};

export type ResearchFinding = {
  id: string;
  vendor: Vendor;
  pattern_category: PatternCategory;
  slug: string;
  title: string;
  what_changed: string;
  why_it_matters: string;
  stack_components: string[];
  source_urls: string[];
  status: "new" | "approved" | "discarded";
  discarded_reason: DiscardReason | null;
  digest_post_id: string | null;
  digested_at: string | null;
  confidence: number | null;
  found_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const FINDING_COLUMNS =
  "id, vendor, pattern_category, slug, title, what_changed, why_it_matters, stack_components, source_urls, status, discarded_reason, digest_post_id, digested_at, confidence, found_at, reviewed_at, reviewed_by";

// Public listing for /research — reads through the anon-scoped client the
// same way build-log/page.tsx reads case_studies, relying on the "public
// reads approved research findings" RLS policy rather than the admin client.
export async function getApprovedFindings(
  supabase: SupabaseClient,
  opts: { vendor?: Vendor; limit?: number } = {}
): Promise<ResearchFinding[]> {
  let query = supabase
    .from("research_findings")
    .select(FINDING_COLUMNS)
    .eq("status", "approved")
    .order("found_at", { ascending: false });

  if (opts.vendor) query = query.eq("vendor", opts.vendor);
  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query;
  return (data ?? []) as ResearchFinding[];
}

export async function getApprovedFindingBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ResearchFinding | null> {
  const { data } = await supabase
    .from("research_findings")
    .select(FINDING_COLUMNS)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  return (data as ResearchFinding | null) ?? null;
}

// Admin queue — oldest-first, so the review page works through a backlog in
// the order it arrived rather than newest-first burying old items.
export async function getPendingFindings(): Promise<ResearchFinding[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("research_findings")
    .select(FINDING_COLUMNS)
    .eq("status", "new")
    .order("found_at", { ascending: true });
  return (data ?? []) as ResearchFinding[];
}

export async function getRecentlyReviewedFindings(limit = 30): Promise<ResearchFinding[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("research_findings")
    .select(FINDING_COLUMNS)
    .in("status", ["approved", "discarded"])
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ResearchFinding[];
}

type EmbeddingMatch = { source_type: string; source_id: string; similarity: number };

// Backs the search_pipeline_patterns MCP tool (§8 of the design doc):
// structured filters run directly against research_findings — vendor,
// pattern_category, and since are exactly the kind of thing chunk-level
// semantic search can't express cleanly — with the embedding used only as
// an optional relevance re-rank when a free-text query is also supplied.
export async function searchPipelinePatterns(params: {
  query?: string;
  vendor?: Vendor;
  pattern_category?: PatternCategory;
  since?: string;
  limit?: number;
}): Promise<ResearchFinding[]> {
  const supabase = createAdminClient();
  const limit = params.limit ?? 10;

  if (!params.query) {
    let query = supabase
      .from("research_findings")
      .select(FINDING_COLUMNS)
      .eq("status", "approved")
      .order("found_at", { ascending: false })
      .limit(limit);
    if (params.vendor) query = query.eq("vendor", params.vendor);
    if (params.pattern_category) query = query.eq("pattern_category", params.pattern_category);
    if (params.since) query = query.gte("found_at", params.since);
    const { data } = await query;
    return (data ?? []) as ResearchFinding[];
  }

  const embedding = await embedOne(params.query, "query", "mcp_search_pipeline_patterns");
  const { data: matchData } = await supabase.rpc("match_content_embeddings", {
    query_embedding: embedding,
    match_count: 40,
  });
  const matches = (matchData ?? []) as EmbeddingMatch[];

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (m.source_type !== "research_finding" || seen.has(m.source_id)) continue;
    seen.add(m.source_id);
    orderedIds.push(m.source_id);
  }
  if (orderedIds.length === 0) return [];

  let query = supabase
    .from("research_findings")
    .select(FINDING_COLUMNS)
    .eq("status", "approved")
    .in("id", orderedIds);
  if (params.vendor) query = query.eq("vendor", params.vendor);
  if (params.pattern_category) query = query.eq("pattern_category", params.pattern_category);
  if (params.since) query = query.gte("found_at", params.since);

  const { data } = await query;
  const bySlug = new Map((data ?? []).map((f) => [(f as ResearchFinding).id, f as ResearchFinding]));
  return orderedIds.map((id) => bySlug.get(id)).filter((f): f is ResearchFinding => !!f).slice(0, limit);
}

export async function approveFinding(id: string, reviewedBy: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: finding } = await supabase
    .from("research_findings")
    .select("title, vendor")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("research_findings")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "research_finding.approve",
    entity_type: "research_finding",
    entity_id: id,
    summary: `Approved "${finding?.title ?? id}" (${finding?.vendor ?? "?"}) — now live at /research`,
  });
}

export async function discardFinding(
  id: string,
  reason: DiscardReason,
  reviewedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const { data: finding } = await supabase
    .from("research_findings")
    .select("title, vendor")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("research_findings")
    .update({
      status: "discarded",
      discarded_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", id);

  await logContentChange({
    source: "admin_ui",
    action: "research_finding.discard",
    entity_type: "research_finding",
    entity_id: id,
    summary: `Discarded "${finding?.title ?? id}" (${finding?.vendor ?? "?"}) — ${DISCARD_REASON_LABELS[reason]}`,
  });
}
