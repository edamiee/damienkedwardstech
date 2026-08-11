import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/voyage";
import { runClaudeToolLoop, type ToolDefinition } from "@/lib/anthropic";
import { getSiteContent } from "@/lib/site-content";
import { saveContactMessage } from "@/lib/contact-notify";
import { getPipelineActivityMetrics, formatRate, formatHours } from "@/lib/pipeline-metrics";
import { AUDIT_SOURCE_LABELS, type AuditSource } from "@/lib/audit-log";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { SIMILARITY_THRESHOLD } from "@/lib/content-search";

const SYSTEM_PROMPT = `You are the assistant embedded on Damien Edwards' professional AI/data engineering portfolio site, damienkedwards.tech. Answer questions about Damien's work, writing, and build log using ONLY the CONTEXT block below — it's pulled live from his published posts, papers, build log entries, and gated project listings. If the context doesn't answer the question, say you don't have that information and suggest the visitor use the contact page. Some context entries are gated projects (name and short description only, no link) — for these, mention that the project exists and tell the visitor to sign in at /projects to see it; never invent or guess a URL for it. Keep answers to 2-4 sentences of plain prose, no markdown headers or bullet lists. Never invent details about Damien that aren't in the context. You have a few tools available beyond the context: use get_availability if asked whether Damien is available for work, use get_build_log_stats if asked about measurable results from a specific build log entry, use get_github_activity if asked how active Damien currently is on GitHub or for his real commit/PR/issue numbers, and use notify_damien ONLY when a visitor clearly wants to be contacted and you already have their email — confirm with them what you're sending before calling it.`;

// Naive in-memory per-IP rate limit — resets on cold start and isn't
// shared across serverless instances, but it's enough to stop a runaway
// script from burning through Anthropic/Voyage credits on a personal site.
const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

type MatchRow = {
  source_type: string;
  source_id: string;
  title: string;
  url_path: string;
  chunk_text: string;
  similarity: number;
};

type ChatSource = {
  title: string;
  url_path: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
};

// Looks up the most recent audit-log entry for each matched chunk's owning
// row, so the widget can show which agent/path last touched the content an
// answer is grounded in — the same provenance the /agent-activity page
// surfaces, just scoped to what's actually relevant to this answer.
async function attachProvenance(
  supabase: SupabaseClient,
  sources: (ChatSource & { source_type: string; source_id: string })[]
): Promise<ChatSource[]> {
  if (sources.length === 0) return [];

  const entityTypes = [...new Set(sources.map((s) => s.source_type))];
  const entityIds = [...new Set(sources.map((s) => s.source_id))];

  const { data } = await supabase
    .from("content_audit_log")
    .select("source, entity_type, entity_id, created_at")
    .in("entity_type", entityTypes)
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false });

  const latestBySource = new Map<string, { source: AuditSource; created_at: string }>();
  for (const row of data ?? []) {
    const key = `${row.entity_type}:${row.entity_id}`;
    if (!latestBySource.has(key)) {
      latestBySource.set(key, { source: row.source as AuditSource, created_at: row.created_at });
    }
  }

  return sources.map(({ source_type, source_id, ...rest }) => {
    const provenance = latestBySource.get(`${source_type}:${source_id}`);
    if (!provenance) return rest;
    return {
      ...rest,
      lastUpdatedBy: AUDIT_SOURCE_LABELS[provenance.source] ?? provenance.source,
      lastUpdatedAt: formatRelativeTime(provenance.created_at),
    };
  });
}

const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: "get_availability",
    description: "Check Damien's current availability status and preferred contact info.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_build_log_stats",
    description:
      "Get the measurable outcome stats for a specific build log entry by its slug (slugs appear in the CONTEXT sources' URLs, e.g. /build-log/site-agent -> slug 'site-agent').",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "get_github_activity",
    description:
      "Get live commit, PR, and issue stats from Damien's own GitHub activity data pipeline (a real dbt + Postgres pipeline over his GitHub account, not a static number). Use for questions about how active he currently is, his commit volume, or PR/issue turnaround.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "notify_damien",
    description:
      "Send Damien a message on the visitor's behalf when they want to get in touch. Only call this once you have the visitor's email and a clear message to send, and after confirming with them what you're about to send.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        message: { type: "string" },
      },
      required: ["email", "message"],
    },
  },
];

async function executeChatTool(
  supabase: SupabaseClient,
  content: Awaited<ReturnType<typeof getSiteContent>>,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "get_availability") {
    return `Now: ${content.now_line || "no status set"}. Contact: ${content.contact_email}.`;
  }

  if (name === "get_build_log_stats") {
    const slug = String(input.slug ?? "").trim();
    const { data } = await supabase
      .from("case_studies")
      .select("stats")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    const stats = (data?.stats ?? []) as { value: string; label: string }[];
    if (stats.length === 0) return "No stats recorded for that build log entry.";
    return stats.map((s) => `${s.value} ${s.label}`).join("; ");
  }

  if (name === "get_github_activity") {
    const metrics = await getPipelineActivityMetrics();
    if (!metrics) return "GitHub activity data isn't available right now.";
    return [
      `${metrics.totalCommits} commits across ${metrics.activeRepos} active repos.`,
      `${metrics.totalPrs} pull requests, ${formatRate(metrics.mergedPrs, metrics.totalPrs)} merged, average cycle time ${formatHours(metrics.avgPrCycleTimeHours)}.`,
      `${metrics.totalIssues} issues, ${formatRate(metrics.closedIssues, metrics.totalIssues)} closed, average time to close ${formatHours(metrics.avgIssueCloseHours)}.`,
      metrics.lastIngestedAt ? `Data last refreshed ${metrics.lastIngestedAt}.` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (name === "notify_damien") {
    const visitorName = String(input.name ?? "Chat visitor").trim() || "Chat visitor";
    const email = String(input.email ?? "").trim();
    const message = String(input.message ?? "").trim();
    if (!email || !message) return "Error: need both an email and a message to notify Damien.";
    const { error } = await saveContactMessage(supabase, {
      name: visitorName,
      email,
      message,
      source: "chat-agent",
    });
    return error ? `Error: ${error}` : "Done — Damien has been notified and will follow up by email.";
  }

  return `Error: unknown tool "${name}".`;
}

export async function POST(request: NextRequest) {
  const content = await getSiteContent();
  if (content.chat_enabled === "false") {
    return NextResponse.json({ error: "Chat is currently disabled." }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }

  let body: { message?: string; history?: { role?: string; text?: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "message is too long (500 char max)" }, { status: 400 });
  }

  // Client-supplied prior turns — needed so a follow-up like "yes, go
  // ahead" after notify_damien asks to confirm actually has something to
  // confirm. Capped and length-limited since it's untrusted input from the
  // visitor's own browser (worst case it can only steer this same
  // request's tool calls, not escalate beyond what those tools already do).
  const history = (body.history ?? [])
    .slice(-10)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: (m.text as string).slice(0, 2000),
    }));

  const supabase = createAdminClient();

  let contextBlock = "(no matching content found)";
  let sources: ChatSource[] = [];

  try {
    const queryEmbedding = await embedOne(message, "query");
    const { data } = await supabase.rpc("match_content_embeddings", {
      query_embedding: queryEmbedding,
      match_count: 6,
    });
    const matches = (data ?? []) as MatchRow[];

    if (matches.length > 0) {
      // Deliberately excludes url_path from what the model reads — a URL
      // slug can carry old wording (e.g. a renamed page keeping its
      // original slug) that would otherwise leak into the answer even
      // after the visible title/text have been rewritten. Sources are
      // still returned separately below for the widget's citation links.
      contextBlock = matches
        .map((m) => `Source: ${m.title}\n${m.chunk_text}`)
        .join("\n\n---\n\n");

      const seen = new Set<string>();
      const dedupedMatches = matches.filter((m) => {
        if (seen.has(m.url_path)) return false;
        seen.add(m.url_path);
        return true;
      });

      sources = await attachProvenance(
        supabase,
        dedupedMatches.map((m) => ({
          title: m.title,
          url_path: m.url_path,
          source_type: m.source_type,
          source_id: m.source_id,
        }))
      );
    }

    // matches is ordered by ascending distance, so the first entry is the
    // best match — same threshold content-search.ts uses to decide a
    // result is worth showing at all. Below it, the question is logged as
    // a content gap for the admin chat-index page to surface.
    const bestSimilarity = matches[0]?.similarity ?? 0;
    if (bestSimilarity < SIMILARITY_THRESHOLD) {
      await supabase.from("chat_content_gaps").insert({ question: message, best_similarity: bestSimilarity });
    }
  } catch (err) {
    // Retrieval failing (e.g. index not built yet) shouldn't take the whole
    // chat down — fall back to answering without grounded context.
    console.error("chat retrieval failed", err);
  }

  const userPrompt = `CONTEXT:\n${contextBlock}\n\nQUESTION: ${message}`;

  try {
    const answer = await runClaudeToolLoop({
      system: SYSTEM_PROMPT,
      userPrompt,
      tools: CHAT_TOOLS,
      executeTool: (name, input) => executeChatTool(supabase, content, name, input),
      maxTokens: 400,
      maxTurns: 3,
      history,
    });
    return NextResponse.json({ answer: answer.trim(), sources });
  } catch (err) {
    console.error("chat generation failed", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 }
    );
  }
}
