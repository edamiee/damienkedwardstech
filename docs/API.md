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
| `post` | `posts` (by slug, derived from `title`) | `title` | `body_markdown` required. `cover_image_url` optional (must already be hosted — this endpoint doesn't accept file uploads). `tags: string[]` optional. `reading_minutes` computed automatically. `publish_at` (ISO timestamp) optionally delays visibility until that time. `series` + `series_order` optionally group multi-part posts. `is_site_post` (boolean, default `false`) flags posts about the site itself vs. other topics. `source` defaults to `"agent"` — set to `"hermes"`/`"agent"` so the homepage's agent-activity line picks it up. |
| `paper` | `papers` (by slug) | `title` | `url` required (external link, not hosted). |
| `build_log` | `case_studies` (by slug) | `title` | `project_url` optional — omit for internal work with nothing public to link to. `stats: [{value, label}]` optional, renders as pull-quote callouts. `publish_at`/`source` work the same as on posts. `"case_study"` is accepted as a legacy alias for `"build_log"`. |
| `site_content` | `site_content` (by key) | `key` | See [Site content keys](#site-content-keys) below. |
| `nav_link` | `nav_links` (by `id` if given, else insert) | `id` \| new | `label`, `href`, `sort_order`, `visible`. |
| `service` | `home_services` (by `id` if given, else insert) | `id` \| new | `title`, `body` (card description), `sort_order`, `visible`. |
| `project` | `site_projects` (by slug from `name`, or `id`) | `id` \| new | `name`, `url`, `description`, `image_url`, `visible`. This is the *gated* projects list — always a teaser, never fully indexed for chat. |
| `github_link` | `github_links` (by `id` if given, else insert) | `id` \| new | `label`, `url`, `sort_order`, `visible`. Shown on the gated `/projects` page. |

Response: `{ post: {...} }` / `{ build_log: {...} }` / etc. — the upserted
row. Errors return `{ error: "..." }` with a 4xx/5xx status.

**Rate limit:** 60 requests/minute, global (not per-IP — every call shares
the one secret, so total volume is the meaningful thing to bound). Returns
429 once exceeded. Every successful write is also recorded in
`content_audit_log` (source `"site_agent"`), viewable at
[Admin → Audit log](/admin/audit-log), the public
[`/agent-activity`](/agent-activity) page, or read back programmatically
via [`GET /api/admin/audit-logs`](#get-apiadminaudit-logs) below.

#### Site content keys

```
site_name, home_eyebrow, home_heading, home_subheading, now_line,
uncharted_heading, uncharted_body, hermes_activity_label, weekly_ai_insight,
about_body, about_skills, about_capabilities, about_elsewhere_links, resume_url, ai_news_links, footer_tagline,
contact_intro, contact_email, contact_linkedin, chat_enabled ("true"/"false"),
chat_header, chat_subheader, chat_example_question, newsletter_capture_enabled,
newsletter_sending_enabled ("true"/"false"), newsletter_from_email,
testimonials_enabled ("true"/"false"), business_inquiry_enabled ("true"/"false"),
business_inquiry_intro, how_it_works_intro, how_it_works_sources,
how_it_works_surfaces, how_it_works_stack, how_it_works_related_body,
how_it_works_related_link_title, how_it_works_related_link_slug,
agent_activity_eyebrow, agent_activity_heading, agent_activity_intro
```

`about_elsewhere_links`, `ai_news_links`, and `how_it_works_sources`/
`_surfaces` are stored as one `Title | detail` pair per line — a real
structured list without a bespoke editor, parsed with `parsePairs()` in
`src/lib/content-pairs.ts`. For `about_elsewhere_links` and
`ai_news_links`, `detail` is the external URL the title links to; an empty
value hides the "Also published elsewhere" section on `/about`, or the
"Latest in AI" section on the homepage, entirely.

`about_capabilities` is the same idea with two extra fields — one
`Title | body | build-log link title | build-log slug` line per "What I
do" card on `/about`, parsed with `parseCapabilities()` in the same file.

---

### `GET /api/admin/audit-logs`

Remote read endpoint over `content_audit_log` — the same table
[Admin → Audit log](/admin/audit-log) and the public
[`/agent-activity`](/agent-activity) page read, for a script/agent that
wants the full trail (including `entity_id`) rather than the public page's
trimmed-down view.

**Auth:** `Authorization: Bearer <ADMIN_API_SECRET>` (same static secret as
`POST /api/admin/content`).

Query params (all optional):

| Param | Notes |
|---|---|
| `source` | One of `admin_ui`, `site_agent`, `research_agent`, `dev_log_agent`, `telegram_agent`, `mcp_agent`. Omit for all sources. |
| `limit` | Max rows to return. Default 50, capped at 200. |

```json
// GET /api/admin/audit-logs?source=site_agent&limit=20
// Response
{
  "entries": [
    {
      "id": "...",
      "source": "site_agent",
      "action": "post.upsert",
      "entity_type": "post",
      "entity_id": "...",
      "summary": "Upserted \"...\" (published)",
      "created_at": "2026-08-10T01:47:12.000Z"
    }
  ]
}
```

**Rate limit:** 60 requests/minute, global — same policy as
`POST /api/admin/content`.

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

## MCP server

### `POST /api/mcp`

Remote MCP server (Streamable HTTP transport, stateless — a fresh server
instance per request, so no client-side session cleanup is required). Point
any MCP-speaking client or LLM at this URL to give it tools for this site.

**Auth:** none required for the public tier. The admin tier unlocks with
either `Authorization: Bearer <ADMIN_API_SECRET>` (the static secret) or a
valid OAuth access token minted by this site's own minimal OAuth server
(see below) — either way, unauthenticated callers never see the admin
tools in `tools/list`, they're absent from discovery entirely, not just
blocked from calling.

| Tier | Tools | Notes |
|---|---|---|
| Public (always available) | `search_content`, `get_build_log_stats`, `get_availability` | Read-only, safe for any client. `search_content` takes an optional `site_only` boolean to restrict results to posts about damienkedwardstech itself. |
| Admin (bearer-gated) | `list_site_content`, `update_site_content`, `add_testimonial`, `add_service` | Same tool set + executor as the Telegram admin agent (`src/lib/admin-agent-tools.ts`); writes logged to `content_audit_log` with source `"mcp_agent"` |

Built with `@modelcontextprotocol/server` v2 (`createMcpHandler` +
`McpServer`), which negotiates protocol era per request — modern
(2026-07-28) clients get the envelope-based exchange, older clients
(2025-era, most current MCP clients as of this writing) get an old-school
stateless fallback automatically. Either way, no server-side session state
persists between requests, which is what makes this safe to run on Vercel's
serverless functions.

Quick test with `curl`:

```bash
curl -s https://damienkedwards.tech/api/mcp \
  -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Connecting a client:**

- **Claude Desktop / Claude Code** — add to the client's MCP config
  (Claude Desktop: Settings → Connectors → Add custom connector, or edit
  `claude_desktop_config.json` directly; Claude Code: `claude mcp add
  --transport http damienkedwardstech https://damienkedwards.tech/api/mcp`):
  ```json
  {
    "mcpServers": {
      "damienkedwardstech": { "type": "http", "url": "https://damienkedwards.tech/api/mcp" }
    }
  }
  ```
  For the admin tier, add a header:
  ```json
  {
    "mcpServers": {
      "damienkedwardstech": {
        "type": "http",
        "url": "https://damienkedwards.tech/api/mcp",
        "headers": { "Authorization": "Bearer <ADMIN_API_SECRET>" }
      }
    }
  }
  ```
- **Claude web (claude.ai)** — Customize → Connectors → Add custom
  connector → paste the URL, click Add. claude.ai discovers this site's
  OAuth server automatically (via the `.well-known` documents below),
  registers itself as a client, and redirects to `/api/mcp/authorize` for
  sign-in + consent — same admin login as `/admin`, no manual header
  needed. (Its "Request headers" field, when present, is a beta-gated
  alternative that also works if preferred — see the OAuth server section
  below for why either path lands on the same admin tier.)
- **Any other MCP client** (Cursor, Windsurf, ChatGPT connectors, a custom
  script using `@modelcontextprotocol/sdk`'s client) — the same URL works;
  clients that only support OAuth follow the discovery documents below,
  clients that support a raw bearer header can use either the static
  secret or a token obtained through the OAuth flow manually.

### This site's own OAuth server

A minimal OAuth 2.1 authorization server exists solely to front the admin
tier of `/api/mcp` for clients that can't send a raw bearer header (like
claude.ai's web connector UI). It has no separate user base — consent is
gated by the exact same admin login used at `/admin` (`public.admins`).
Registering a client here grants nothing by itself; a signed-in admin
still has to approve that specific client at `/api/mcp/authorize`.

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata — advertises the three endpoints below |
| `GET /.well-known/oauth-protected-resource` (and `/…/api/mcp`) | RFC 9728 metadata — points `/api/mcp` at the authorization server |
| `POST /api/mcp/register` | RFC 7591 dynamic client registration. Open/unauthenticated — see rationale above. Body: `{ redirect_uris: string[], client_name?: string }` |
| `GET /api/mcp/authorize` | Authorization endpoint. Requires an admin session (redirects to a sign-in form if absent); on approval, redirects back to the client's `redirect_uri` with a single-use code |
| `POST /api/mcp/token` | Token endpoint. `grant_type=authorization_code` (with PKCE `code_verifier`, required) or `grant_type=refresh_token`. Access tokens last 90 days; refresh rotates both tokens. |

PKCE (S256) is required on every authorization request; there is no
client secret (`token_endpoint_auth_method: "none"`) since these are
public clients identified only by a registered `redirect_uri`.

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
build log entries, gated-project teasers) via pgvector, plus three tools
Claude can call mid-conversation: `get_availability`, `get_build_log_stats`,
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
{
  "answer": "...",
  "sources": [
    {
      "title": "...",
      "url_path": "...",
      "lastUpdatedBy": "Admin UI",   // optional — which write path last touched this content, per content_audit_log
      "lastUpdatedAt": "2 days ago"  // optional — omitted alongside lastUpdatedBy if no audit-log entry exists
    }
  ]
}
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

### `GET /api/cron/purge-agent-logs`

Deletes `content_audit_log` rows older than 7 days. The table has no other
cleanup path, so this keeps it from growing unbounded — the admin
audit-log page only needs a recent window, not a permanent archive.
`/agent-activity`'s per-source "N writes total" and "last active" figures
are unaffected: they read from `audit_source_totals`, bumped by trigger on
every insert and never touched by this delete, so they stay lifetime
figures.

**Auth:** `Authorization: Bearer <CRON_SECRET>` — same as above.

Schedule: daily, 05:00 UTC (`0 5 * * *`).

```json
// Response
{ "ok": true, "deleted": 12 }
```

---

## Public feeds & metadata

All of these are unauthenticated `GET` requests with no request body.

| Route | Returns |
|---|---|
| `/feed.xml` | RSS 2.0 of published posts (≤50, newest first) |
| `/build-log/feed.xml` | RSS 2.0 of the build log (≤50, newest first) |
| `/llms.txt` | Plain-text site map for AI agents/crawlers — posts, build log, papers, contact info |
| `/sitemap.xml` | Standard XML sitemap (Next.js `sitemap.ts`) |
| `/robots.txt` | Standard robots file |
| `/opengraph-image`, `/writing/[slug]/opengraph-image`, `/build-log/[slug]/opengraph-image` | Dynamically generated 1200×630 OG images (`next/og`) |

All of the above respect scheduled publishing — a post/build-log entry with a
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
| Static bearer secret or OAuth token, optional/tiered | `/api/mcp` | `ADMIN_API_SECRET` or a token from this site's own OAuth server, only required to unlock the admin tool tier — the public tools work unauthenticated |
| Supabase session cookie | `/api/mcp/authorize` | Same admin login as `/admin` — gates consent for the OAuth server above |
| Supabase session cookie | `/api/admin/draft-post`, `/api/admin/upload-image`, `/admin/subscribers/export`, all `/admin/*` pages | `requireAdmin()` — checks a logged-in session against `public.admins` |
| Cron secret | `/api/cron/weekly-insight`, `/api/cron/purge-agent-logs` | `Authorization: Bearer <CRON_SECRET>` — Vercel supplies this automatically for its own cron |
| Telegram secret token + chat-id allowlist | `/api/telegram/webhook` | Header match + numeric chat id match; anyone else gets a silent 200 |
| None (public) | `/api/chat`, feeds, `/unsubscribe`, `/auth/callback` | Rate-limited where it could be abused (`/api/chat` only) |
