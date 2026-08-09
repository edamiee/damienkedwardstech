import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@/lib/site-content";
import { computeReadingMinutes } from "@/lib/reading-time";
import { logContentChange } from "@/lib/audit-log";

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
//   "cover_image_url": "...", "tags": ["..."], "published": true, "source": "hermes" }
//   -> upserts public.posts by slug (derived from title). "source" defaults
//      to "agent" if omitted; set it to "hermes" or "agent" so the
//      homepage's agent-activity line picks it up. "cover_image_url" is
//      optional — must already be a hosted URL (this endpoint doesn't accept
//      file uploads; use the admin editor at /admin/posts to upload one).
//      "tags" is optional (defaults to none); reading time is computed
//      automatically from body_markdown. "publish_at" is an optional ISO
//      timestamp — if set (and published is true), the post stays hidden
//      from every public listing/feed/index until that time, then goes
//      live on its own with no further action needed. "series" is an
//      optional string — posts sharing the same series get prev/next
//      navigation between them, ordered by "series_order" (default 0).
//
// { "type": "paper", "title": "...", "url": "...", "description": "...",
//   "published": true }
//   -> upserts public.papers by slug (derived from title)
//
// { "type": "case_study", "title": "...", "summary": "...", "problem": "...",
//   "approach": "...", "outcome": "...", "stack": "...", "project_url": "...",
//   "stats": [{"value": "40%", "label": "faster ingestion"}],
//   "published": true, "source": "hermes" }
//   -> upserts public.case_studies by slug (derived from title).
//      project_url is optional — omit it for work with nothing public to
//      link to (e.g. an internal agent or tool). "stats" is optional
//      (defaults to none) and renders as pull-quote callouts. "publish_at"
//      works the same as on posts (see above). "source" works the same
//      as on posts, defaulting to "agent".
//
// { "type": "site_content", "key": "about_body", "value": "..." }
//   -> upserts public.site_content by key. Valid keys: see SITE_CONTENT_DEFAULTS
//      in src/lib/site-content.ts (site_name, home_eyebrow, home_heading,
//      home_subheading, now_line, uncharted_heading, uncharted_body,
//      weekly_ai_insight, about_body, about_skills,
//      resume_url, footer_tagline, contact_intro, contact_email,
//      contact_linkedin, chat_enabled ("true"/"false"),
//      chat_header, chat_subheader, chat_example_question,
//      newsletter_capture_enabled, newsletter_sending_enabled ("true"/"false"),
//      newsletter_from_email).
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
//   "description": "...", "image_url": "...", "visible": true }
//   -> upserts public.site_projects by slug (derived from name) if no id
//      given, otherwise updates by id
//
// { "type": "github_link", "id": "...", "label": "...", "url": "...",
//   "sort_order": 0, "visible": true }
//   -> updates public.github_links by id if id given, otherwise inserts.
//      Shown on the gated /projects page — add one per repo you want
//      linked there, no limit on how many.
//
// Posts/papers/case studies/projects upsert by slug, so posting the same
// title/name again updates that entry instead of creating a duplicate.

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Global (not per-IP) rate limit — every call carries the same one secret,
// so the meaningful axis to bound is total write volume, not source
// address, which a script holding a leaked secret could rotate anyway.
// Resets on cold start; the goal is capping blast radius, not perfect
// accounting.
const RATE_LIMIT = 60; // requests
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestTimestamps.push(now);
  return requestTimestamps.length > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited()) {
    return NextResponse.json(
      { error: "Too many requests — try again in a minute." },
      { status: 429 }
    );
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

    await logContentChange({
      source: "site_agent",
      action: "site_content.update",
      entity_type: "site_content",
      entity_id: key,
      summary: `Updated ${key}`,
    });

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

    await logContentChange({
      source: "site_agent",
      action: id ? "nav_link.update" : "nav_link.create",
      entity_type: "nav_link",
      entity_id: data?.id ?? null,
      summary: `${id ? "Updated" : "Added"} nav link "${data?.label}"`,
    });

    return NextResponse.json({ nav_link: data });
  }

  if (type === "github_link") {
    const id = body.id as string | undefined;
    const label = body.label as string;
    const url = body.url as string;
    if (!id && (!label || !url)) {
      return NextResponse.json(
        { error: "label and url are required to create a github link" },
        { status: 400 }
      );
    }
    const payload: Record<string, unknown> = {};
    if (label !== undefined) payload.label = label;
    if (url !== undefined) payload.url = url;
    if (body.sort_order !== undefined) payload.sort_order = Number(body.sort_order);
    if (body.visible !== undefined) payload.visible = Boolean(body.visible);

    const query = id
      ? supabase.from("github_links").update(payload).eq("id", id)
      : supabase.from("github_links").insert(payload);
    const { data, error } = await query.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logContentChange({
      source: "site_agent",
      action: id ? "github_link.update" : "github_link.create",
      entity_type: "github_link",
      entity_id: data?.id ?? null,
      summary: `${id ? "Updated" : "Added"} GitHub link "${data?.label}"`,
    });

    return NextResponse.json({ github_link: data });
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

    await logContentChange({
      source: "site_agent",
      action: id ? "service.update" : "service.create",
      entity_type: "service",
      entity_id: data?.id ?? null,
      summary: `${id ? "Updated" : "Added"} service card "${data?.title}"`,
    });

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
    if (body.image_url !== undefined) payload.image_url = body.image_url;
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

    await logContentChange({
      source: "site_agent",
      action: id ? "project.update" : "project.create",
      entity_type: "project",
      entity_id: data?.id ?? null,
      summary: `${id ? "Updated" : "Added"} gated project "${data?.name}"`,
    });

    return NextResponse.json({ project: data });
  }

  const { title, published = false } = body;

  if (!title || (type !== "post" && type !== "paper" && type !== "case_study")) {
    return NextResponse.json(
      {
        error:
          "type must be one of 'post', 'paper', 'case_study', 'site_content', 'nav_link', 'service', 'project', 'github_link'",
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
          cover_image_url: body.cover_image_url ?? null,
          tags: Array.isArray(body.tags) ? body.tags : [],
          series: body.series ?? null,
          series_order: body.series_order ?? 0,
          reading_minutes: computeReadingMinutes(body.body_markdown),
          published,
          published_at: published ? body.publish_at ?? new Date().toISOString() : null,
          publish_at: body.publish_at ?? null,
          source: body.source ?? "agent",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logContentChange({
      source: "site_agent",
      action: "post.upsert",
      entity_type: "post",
      entity_id: data?.id ?? null,
      summary: `Upserted "${title}"${published ? " (published)" : " (draft)"}`,
    });

    return NextResponse.json({ post: data });
  }

  if (type === "paper") {
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

    await logContentChange({
      source: "site_agent",
      action: "paper.upsert",
      entity_type: "paper",
      entity_id: data?.id ?? null,
      summary: `Upserted "${title}"${published ? " (published)" : " (draft)"}`,
    });

    return NextResponse.json({ paper: data });
  }

  const { data, error } = await supabase
    .from("case_studies")
    .upsert(
      {
        slug,
        title,
        summary: body.summary ?? null,
        problem: body.problem ?? null,
        approach: body.approach ?? null,
        outcome: body.outcome ?? null,
        stack: body.stack ?? null,
        stats: Array.isArray(body.stats) ? body.stats : [],
        project_url: body.project_url ?? null,
        published,
        published_at: published ? body.publish_at ?? new Date().toISOString() : null,
        publish_at: body.publish_at ?? null,
        source: body.source ?? "agent",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logContentChange({
    source: "site_agent",
    action: "case_study.upsert",
    entity_type: "case_study",
    entity_id: data?.id ?? null,
    summary: `Upserted "${title}"${published ? " (published)" : " (draft)"}`,
  });

  return NextResponse.json({ case_study: data });
}
