import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/voyage";
import { callClaude } from "@/lib/anthropic";
import { getSiteContent } from "@/lib/site-content";

const SYSTEM_PROMPT = `You are the assistant embedded on Damien Edwards' professional AI/data engineering portfolio site, damienkedwards.tech. Answer questions about Damien's work, writing, and case studies using ONLY the CONTEXT block below — it's pulled live from his published posts, papers, case studies, and gated project listings. If the context doesn't answer the question, say you don't have that information and suggest the visitor use the contact page. Some context entries are gated projects (name and short description only, no link) — for these, mention that the project exists and tell the visitor to sign in at /projects to see it; never invent or guess a URL for it. Keep answers to 2-4 sentences of plain prose, no markdown headers or bullet lists. Never invent details about Damien that aren't in the context.`;

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
    const answer = await callClaude(SYSTEM_PROMPT, userPrompt, 400);
    return NextResponse.json({ answer: answer.trim(), sources });
  } catch (err) {
    console.error("chat generation failed", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 }
    );
  }
}
