import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { callClaude } from "@/lib/anthropic";

// Admin-only helper: drafts a blog post from a short topic prompt using
// Claude, for review/editing in /admin/posts before publishing. This is a
// starting point for other AI-assisted features on the site — anything
// that calls Claude should follow this same shape: requireAdmin() guard,
// server-only callClaude() wrapper, never expose ANTHROPIC_API_KEY to the
// client.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic } = await request.json();
  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const system = `You draft blog posts for an AI/data engineer's professional site. Write in first person, direct and technical, no marketing fluff. Respond with strict JSON only: {"title": string, "excerpt": string (one sentence), "body_markdown": string (the post body in Markdown, no h1 title in the body)}.`;

  const raw = await callClaude(system, `Draft a post about: ${topic}`, 2000);

  let draft: { title: string; excerpt: string; body_markdown: string };
  try {
    draft = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Claude returned non-JSON output", raw },
      { status: 502 }
    );
  }

  return NextResponse.json({ draft });
}
