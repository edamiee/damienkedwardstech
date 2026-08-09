import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/voyage";
import { runClaudeToolLoop, type ToolDefinition } from "@/lib/anthropic";
import { getSiteContent } from "@/lib/site-content";
import { saveContactMessage } from "@/lib/contact-notify";

const SYSTEM_PROMPT = `You are the assistant embedded on Damien Edwards' professional AI/data engineering portfolio site, damienkedwards.tech. Answer questions about Damien's work, writing, and case studies using ONLY the CONTEXT block below — it's pulled live from his published posts, papers, case studies, and gated project listings. If the context doesn't answer the question, say you don't have that information and suggest the visitor use the contact page. Some context entries are gated projects (name and short description only, no link) — for these, mention that the project exists and tell the visitor to sign in at /projects to see it; never invent or guess a URL for it. Keep answers to 2-4 sentences of plain prose, no markdown headers or bullet lists. Never invent details about Damien that aren't in the context. You have a few tools available beyond the context: use get_availability if asked whether Damien is available for work, use get_case_study_stats if asked about measurable results from a specific case study, and use notify_damien ONLY when a visitor clearly wants to be contacted and you already have their email — confirm with them what you're sending before calling it.`;

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
  title: string;
  url_path: string;
  chunk_text: string;
  similarity: number;
};

const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: "get_availability",
    description: "Check Damien's current availability status and preferred contact info.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_case_study_stats",
    description:
      "Get the measurable outcome stats for a specific case study by its slug (slugs appear in the CONTEXT sources' URLs, e.g. /case-studies/site-agent -> slug 'site-agent').",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
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

  if (name === "get_case_study_stats") {
    const slug = String(input.slug ?? "").trim();
    const { data } = await supabase
      .from("case_studies")
      .select("stats")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    const stats = (data?.stats ?? []) as { value: string; label: string }[];
    if (stats.length === 0) return "No stats recorded for that case study.";
    return stats.map((s) => `${s.value} ${s.label}`).join("; ");
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

  let body: { message?: string };
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

  const supabase = createAdminClient();

  let contextBlock = "(no matching content found)";
  let sources: { title: string; url_path: string }[] = [];

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
      sources = matches
        .filter((m) => {
          if (seen.has(m.url_path)) return false;
          seen.add(m.url_path);
          return true;
        })
        .map((m) => ({ title: m.title, url_path: m.url_path }));
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
