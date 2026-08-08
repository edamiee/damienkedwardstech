import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Remote content endpoint — for the Hermes agent (or any authenticated
// script/agent) to create or update posts and papers without going through
// the /admin UI. Auth is a static bearer secret, not a Supabase session,
// since the caller isn't a browser with a cookie jar.
//
// POST /api/admin/content
// Authorization: Bearer <ADMIN_API_SECRET>
// {
//   "type": "post",          // or "paper"
//   "title": "...",
//   "body_markdown": "...",  // posts only
//   "excerpt": "...",        // posts only, optional
//   "url": "...",            // papers only
//   "description": "...",    // papers only, optional
//   "published": true,       // optional, defaults to false (draft)
//   "source": "hermes"       // optional, defaults to "agent"
// }
//
// Upserts by slug (derived from title), so posting the same title again
// updates that entry instead of creating a duplicate.

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, title, published = false } = body;

  if (!title || (type !== "post" && type !== "paper")) {
    return NextResponse.json(
      { error: "type must be 'post' or 'paper', and title is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const slug = slugify(title);

  if (type === "post") {
    if (!body.body_markdown) {
      return NextResponse.json(
        { error: "body_markdown is required for posts" },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("posts")
      .upsert(
        {
          slug,
          title,
          excerpt: body.excerpt ?? null,
          body_markdown: body.body_markdown,
          published,
          published_at: published ? new Date().toISOString() : null,
          source: body.source ?? "agent",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ post: data });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url is required for papers" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("papers")
    .upsert(
      {
        slug,
        title,
        description: body.description ?? null,
        url: body.url,
        published,
        published_at: published ? new Date().toISOString() : null,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ paper: data });
}
