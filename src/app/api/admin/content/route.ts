import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@/lib/site-content";

// Remote content endpoint — for the Hermes agent (or any authenticated
// script/agent) to update the site without going through the /admin UI.
// Auth is a static bearer secret, not a Supabase session, since the caller
// isn't a browser with a cookie jar.
//
// POST /api/admin/content
// Authorization: Bearer <ADMIN_API_SECRET>
//
// Body shape depends on "type":
//
// { "type": "post", "title": "...", "body_markdown": "...", "excerpt": "...",
//   "published": true, "source": "hermes" }
//   -> upserts public.posts by slug (derived from title)
//
// { "type": "paper", "title": "...", "url": "...", "description": "...",
//   "published": true }
//   -> upserts public.papers by slug (derived from title)
//
// { "type": "site_content", "key": "about_body", "value": "..." }
//   -> upserts public.site_content by key. Valid keys: see SITE_CONTENT_DEFAULTS
//      in src/lib/site-content.ts (home_eyebrow, home_heading, home_subheading,
//      weekly_ai_insight, about_body, about_skills, resume_url, footer_tagline,
//      contact_intro, contact_email, contact_linkedin).
//
// { "type": "nav_link", "id": "...", "label": "...", "href": "...",
//   "sort_order": 0, "visible": true }
//   -> updates public.nav_links by id if id given, otherwise inserts
//
// { "type": "service", "id": "...", "title": "...", "body": "...",
//   "sort_order": 0, "visible": true }
//   -> updates public.home_services by id if id given, otherwise inserts
//      ("body" here is the card's description text, not the request body)
//
// { "type": "project", "id": "...", "name": "...", "url": "...",
//   "description": "...", "visible": true }
//   -> upserts public.site_projects by slug (derived from name) if no id
//      given, otherwise updates by id
//
// Posts/papers/projects upsert by slug, so posting the same title/name
// again updates that entry instead of creating a duplicate.

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
  const { type } = body;
  const supabase = createAdminClient();

  if (type === "site_content") {
    const key = body.key as string;
    const value = body.value;
    if (!key || !(key in SITE_CONTENT_DEFAULTS) || typeof value !== "string") {
      return NextResponse.json(
        {
          error: "key must be a valid site_content key and value must be a string",
          validKeys: Object.keys(SITE_CONTENT_DEFAULTS),
        },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("site_content")
      .upsert(
        { key: key as SiteContentKey, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ site_content: data });
  }

  if (type === "nav_link") {
    const id = body.id as string | undefined;
    const label = body.label as string;
    const href = body.href as string;
    if (!id && (!label || !href)) {
      return NextResponse.json(
        { error: "label and href are required to create a nav link" },
        { status: 400 }
      );
    }
    const payload: Record<string, unknown> = {};
    if (label !== undefined) payload.label = label;
    if (href !== undefined) payload.href = href;
    if (body.sort_order !== undefined) payload.sort_order = Number(body.sort_order);
    if (body.visible !== undefined) payload.visible = Boolean(body.visible);

    const query = id
      ? supabase.from("nav_links").update(payload).eq("id", id)
      : supabase.from("nav_links").insert(payload);
    const { data, error } = await query.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ nav_link: data });
  }

  if (type === "service") {
    const id = body.id as string | undefined;
    const title = body.title as string;
    const serviceBody = body.body as string;
    if (!id && (!title || !serviceBody)) {
      return NextResponse.json(
        { error: "title and body are required to create a service card" },
        { status: 400 }
      );
    }
    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = title;
    if (serviceBody !== undefined) payload.body = serviceBody;
    if (body.sort_order !== undefined) payload.sort_order = Number(body.sort_order);
    if (body.visible !== undefined) payload.visible = Boolean(body.visible);

    const query = id
      ? supabase.from("home_services").update(payload).eq("id", id)
      : supabase.from("home_services").insert(payload);
    const { data, error } = await query.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ service: data });
  }

  if (type === "project") {
    const id = body.id as string | undefined;
    const name = body.name as string | undefined;
    const url = body.url as string | undefined;
    if (!id && (!name || !url)) {
      return NextResponse.json(
        { error: "name and url are required to create a gated project" },
        { status: 400 }
      );
    }
    const payload: Record<string, unknown> = {};
    if (name !== undefined) payload.name = name;
    if (name !== undefined) payload.slug = slugify(name);
    if (url !== undefined) payload.url = url;
    if (body.description !== undefined) payload.description = body.description;
    if (body.visible !== undefined) payload.visible = Boolean(body.visible);

    let query;
    if (id) {
      query = supabase.from("site_projects").update(payload).eq("id", id);
    } else {
      query = supabase
        .from("site_projects")
        .upsert(payload, { onConflict: "slug" });
    }
    const { data, error } = await query.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  }

  const { title, published = false } = body;

  if (!title || (type !== "post" && type !== "paper")) {
    return NextResponse.json(
      {
        error:
          "type must be one of 'post', 'paper', 'site_content', 'nav_link', 'service', 'project'",
      },
      { status: 400 }
    );
  }

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
