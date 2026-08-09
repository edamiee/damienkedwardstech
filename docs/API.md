# API reference

All routes are relative to `https://damienkedwards.tech`. Anything under
`/api/admin/*` or `/api/telegram/*` is authenticated — everything else is
public.

A machine-readable version of the write-side of this doc (everything under
[Content publishing](#content-publishing)) is published at
[`/openapi.json`](https://damienkedwards.tech/openapi.json) — the same
relationship `/llms.txt` has to the site's actual content, but for actions
instead of pages.

---

## Content publishing

### `POST /api/admin/content`

Remote content endpoint — for the Site Agent (`@dames81_bot` / plain HTTP)
or any authenticated script/agent to update the site without going through
`/admin`.

**Auth:** `Authorization: Bearer <ADMIN_API_SECRET>` (static secret, not a
Supabase session — the caller isn't a browser with a cookie jar).

Body shape depends on `"type"`:

| `type` | Upserts | Key | Notes |
|---|---|---|---|
| `post` | `posts` (by slug, derived from `title`) | `title` | `body_markdown` required. `cover_image_url` optional (must already be hosted — this endpoint doesn't accept file uploads). `tags: string[]` optional. `reading_minutes` computed automatically. `publish_at` (ISO timestamp) optionally delays visibility until that time. `series` + `series_order` optionally group multi-part posts. `source` defaults to `"agent"` — set to `"hermes"`/`"agent"` so the homepage's agent-activity line picks it up. |
| `paper` | `papers` (by slug) | `title` | `url` required (external link, not hosted). |
| `case_study` | `case_studies` (by slug) | `title` | `project_url` optional — omit for internal work with nothing public to link to. `stats: [{value, label}]` optional, renders as pull-quote callouts. `publish_at`/`source` work the same as on posts. |
| `site_content` | `site_content` (by key) | `key` | See [Site content keys](#site-content-keys) below. |
| `nav_link` | `nav_links` (by `id` if given, else insert) | `id` \| new | `label`, `href`, `sort_order`, `visible`. |
| `service` | `home_services` (by `id` if given, else insert) | `id` \| new | `title`, `body` (card description), `sort_order`, `visible`. |
| `project` | `site_projects` (by slug from `name`, or `id`) | `id` \| new | `name`, `url`, `description`, `image_url`, `visible`. This is the *gated* projects list — always a teaser, never fully indexed for chat. |
| `github_link` | `github_links` (by `id` if given, else insert) | `id` \| new | `label`, `url`, `sort_order`, `visible`. Shown on the gated `/projects` page. |

Response: `{ post: {...} }` / `{ case_study: {...} }` / etc. — the upserted
row. Errors return `{ error: "..." }` with a 4xx/5xx status.

**Rate limit:** 60 requests/minute, global (not per-IP — every call shares
the one secret, so total volume is the meaningful thing to bound). Returns
429 once exceeded. Every successful write is also recorded in
`content_audit_log` (source `"site_agent"`), viewable at
[Admin → Audit log](/admin/audit-log).

#### Site content keys

```
site_name, home_eyebrow, home_heading, home_subheading, now_line,
uncharted_heading, uncharted_body, weekly_ai_insight, about_body,
about_skills, resume_url, footer_tagline, contact_intro, contact_email,
contact_linkedin, chat_enabled ("true"/"false"), chat_header,
chat_subheader, chat_example_question, newsletter_capture_enabled,
newsletter_sending_enabled ("true"/"false"), newsletter_from_email,
testimonials_enabled ("true"/"false")
```

---

### `POST /api/admin/draft-post`

Admin-only helper: drafts a blog post from a short topic prompt using
Claude (no web search — just Claude's own knowledge). Used as a building
block; the newer [research agent](#agent--admin-tooling-routes) supersedes
this for anything that benefits from live research.

**Auth:** Supabase session cookie, admin only (`requireAdmin()`).

```json
// Request
{ "topic": "vector database indexing tradeoffs" }

// Response
{ "draft": { "title": "...", "excerpt": "...", "body_markdown": "..." } }
```

---

### `POST /api/admin/upload-image`

Uploads an image file to the `post-images` Supabase Storage bucket (public
read), for post cover images and inline markdown images.

**Auth:** Supabase session cookie, admin only.

Request: `multipart/form-data` with a `file` field (image/*, ≤10MB).
Response: `{ url: "https://.../post-images/<uuid>.<ext>" }`.

---

## Agent / admin-tooling routes

### `POST /api/telegram/webhook`

Telegram webhook for the conversational admin agent — a separate, dedicated
bot from Site Agent. Runs a Claude tool-calling loop against a small,
non-destructive tool set: `list_site_content`, `update_site_content`,
`add_testimonial`, `add_service`.

**Auth (two layers):**
1. `X-Telegram-Bot-Api-Secret-Token` header must match `TELEGRAM_WEBHOOK_SECRET` (set via Telegram's `setWebhook`).
2. The message's `chat.id` must equal `TELEGRAM_ADMIN_CHAT_ID` — anyone else is silently dropped (200 OK, no reply, no tool access).

Not meant to be called directly — Telegram calls this after
`setWebhook` is registered:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://damienkedwards.tech/api/telegram/webhook&secret_token=<SECRET>"
```

---

### `POST /api/chat`

The visitor-facing chat widget. RAG over published content (posts, papers,
case studies, gated-project teasers) via pgvector, plus three tools Claude
can call mid-conversation: `get_availability`, `get_case_study_stats`,
`notify_damien` (writes to `contact_messages`, best-effort emails a
notification).

**Auth:** none (public) — rate-limited to 15 requests/60s per IP
(in-memory, resets on cold start).

```json
// Request
{
  "message": "Is Damien available for contract work?",
  "history": [{ "role": "user" | "assistant", "text": "..." }]  // optional, last 10 kept, 2000 chars each
}

// Response
{ "answer": "...", "sources": [{ "title": "...", "url_path": "..." }] }
```

Returns 404 if `chat_enabled` is `"false"` in site content; 429 if rate
limited; 502 if generation fails.

---

## Scheduled jobs

### `GET /api/cron/weekly-insight`

Generates the homepage's weekly note via Claude, saves it to
`site_content` **and** appends it to `weekly_insights` (the
[`/newsletter`](https://damienkedwards.tech/newsletter) archive), then
best-effort emails it to subscribers via Resend if
`newsletter_sending_enabled` is on and a `RESEND_API_KEY` +
`newsletter_from_email` are configured.

**Auth:** `Authorization: Bearer <CRON_SECRET>` — Vercel sends this
automatically for its own scheduled invocation (see `vercel.json`); only
needed manually for local testing.

Schedule: Mondays 14:00 UTC (`0 14 * * 1`).

---

## Public feeds & metadata

All of these are unauthenticated `GET` requests with no request body.

| Route | Returns |
|---|---|
| `/feed.xml` | RSS 2.0 of published posts (≤50, newest first) |
| `/case-studies/feed.xml` | RSS 2.0 of published case studies (≤50, newest first) |
| `/llms.txt` | Plain-text site map for AI agents/crawlers — posts, case studies, papers, contact info |
| `/sitemap.xml` | Standard XML sitemap (Next.js `sitemap.ts`) |
| `/robots.txt` | Standard robots file |
| `/opengraph-image`, `/writing/[slug]/opengraph-image`, `/case-studies/[slug]/opengraph-image` | Dynamically generated 1200×630 OG images (`next/og`) |

All of the above respect scheduled publishing — a post/case study with a
future `publish_at` won't appear in any of them until that time.

---

## Auth & misc

### `GET /auth/callback`

Exchanges a Supabase magic-link code for a session cookie, then redirects
to `?next=` (defaults to `/projects`). Not called directly — this is where
magic-link emails point.

### `GET /unsubscribe?email=...`

One-click unsubscribe from the newsletter. Deliberately unauthenticated
(worst case of a guessed email is removing it from a low-stakes list) —
returns a static HTML confirmation page either way.

### `GET /admin/subscribers/export`

CSV export of the subscribers table (`email,source,created_at`).

**Auth:** Supabase session cookie, admin only.

---

## Auth patterns used across these routes

| Pattern | Used by | Mechanism |
|---|---|---|
| Static bearer secret | `/api/admin/content` | `Authorization: Bearer <ADMIN_API_SECRET>` — for non-browser callers (agents/scripts) |
| Supabase session cookie | `/api/admin/draft-post`, `/api/admin/upload-image`, `/admin/subscribers/export`, all `/admin/*` pages | `requireAdmin()` — checks a logged-in session against `public.admins` |
| Cron secret | `/api/cron/weekly-insight` | `Authorization: Bearer <CRON_SECRET>` — Vercel supplies this automatically for its own cron |
| Telegram secret token + chat-id allowlist | `/api/telegram/webhook` | Header match + numeric chat id match; anyone else gets a silent 200 |
| None (public) | `/api/chat`, feeds, `/unsubscribe`, `/auth/callback` | Rate-limited where it could be abused (`/api/chat` only) |
