const BASE_URL = "https://damienkedwards.tech";

// The site's own REST/feed surface, described as an OpenAPI 3.1 document.
// Single source of truth for both /openapi.json (the machine-readable
// route) and the human-readable API reference section on /how-it-works —
// extracted here so neither has to import the other or duplicate it.
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "damienkedwards.tech content API",
    version: "1.0.0",
    description:
      "Endpoints for publishing and querying content on damienkedwards.tech. " +
      "Full human-readable reference: " +
      BASE_URL +
      "/docs/API.md (in the site's repo). " +
      "For a plain-text map of what's actually published, see " +
      BASE_URL +
      "/llms.txt.",
  },
  servers: [{ url: BASE_URL }],
  components: {
    securitySchemes: {
      adminBearer: {
        type: "http",
        scheme: "bearer",
        description: "ADMIN_API_SECRET — a static secret held by authorized publishing agents.",
      },
      cronBearer: {
        type: "http",
        scheme: "bearer",
        description: "CRON_SECRET — supplied automatically by Vercel Cron in production.",
      },
    },
    schemas: {
      Stat: {
        type: "object",
        properties: { value: { type: "string" }, label: { type: "string" } },
        required: ["value", "label"],
      },
      PostPayload: {
        type: "object",
        properties: {
          type: { const: "post" },
          title: { type: "string" },
          body_markdown: { type: "string" },
          excerpt: { type: "string" },
          cover_image_url: { type: "string", description: "Must already be hosted — this endpoint does not accept file uploads." },
          tags: { type: "array", items: { type: "string" } },
          series: { type: "string" },
          series_order: { type: "integer", default: 0 },
          is_site_post: { type: "boolean", default: false, description: "Flags posts about damienkedwardstech/the arcade itself vs. other topics." },
          published: { type: "boolean", default: false },
          publish_at: { type: "string", format: "date-time", description: "Delays visibility until that time, everywhere on the site, without further action." },
          source: { type: "string", default: "agent", description: "e.g. \"hermes\" or \"agent\" — drives the homepage's agent-activity line." },
        },
        required: ["type", "title", "body_markdown"],
      },
      PaperPayload: {
        type: "object",
        properties: {
          type: { const: "paper" },
          title: { type: "string" },
          url: { type: "string", description: "External link — papers are never hosted on this site." },
          description: { type: "string" },
          published: { type: "boolean", default: false },
        },
        required: ["type", "title", "url"],
      },
      BuildLogPayload: {
        type: "object",
        properties: {
          type: { const: "build_log", description: "\"case_study\" is also accepted as a legacy alias." },
          title: { type: "string" },
          summary: { type: "string" },
          problem: { type: "string" },
          approach: { type: "string" },
          outcome: { type: "string" },
          stack: { type: "string" },
          project_url: { type: "string", description: "Omit for internal work with nothing public to link to." },
          stats: { type: "array", items: { $ref: "#/components/schemas/Stat" } },
          published: { type: "boolean", default: false },
          publish_at: { type: "string", format: "date-time" },
          source: { type: "string", default: "agent" },
        },
        required: ["type", "title"],
      },
      SiteContentPayload: {
        type: "object",
        properties: {
          type: { const: "site_content" },
          key: {
            type: "string",
            enum: [
              "site_name", "home_eyebrow", "home_heading", "home_subheading", "now_line",
              "uncharted_heading", "uncharted_body", "hermes_activity_label", "weekly_ai_insight",
              "about_body", "about_skills", "about_capabilities", "about_elsewhere_links", "resume_url",
              "ai_news_links",
              "footer_tagline", "contact_intro", "contact_email",
              "contact_linkedin", "chat_enabled", "chat_header", "chat_subheader",
              "chat_example_question", "newsletter_capture_enabled",
              "newsletter_sending_enabled", "newsletter_from_email", "testimonials_enabled",
              "business_inquiry_enabled", "business_inquiry_intro", "how_it_works_intro",
              "how_it_works_sources", "how_it_works_surfaces", "how_it_works_stack",
              "how_it_works_related_body", "how_it_works_related_link_title",
              "how_it_works_related_link_slug", "agent_activity_eyebrow",
              "agent_activity_heading", "agent_activity_intro",
            ],
          },
          value: { type: "string" },
        },
        required: ["type", "key", "value"],
      },
      NavLinkPayload: {
        type: "object",
        properties: {
          type: { const: "nav_link" },
          id: { type: "string", format: "uuid", description: "Omit to create a new link." },
          label: { type: "string" },
          href: { type: "string" },
          sort_order: { type: "integer" },
          visible: { type: "boolean" },
        },
        required: ["type"],
      },
      ServicePayload: {
        type: "object",
        properties: {
          type: { const: "service" },
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          body: { type: "string", description: "The card's description text." },
          sort_order: { type: "integer" },
          visible: { type: "boolean" },
        },
        required: ["type"],
      },
      ProjectPayload: {
        type: "object",
        properties: {
          type: { const: "project" },
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
          image_url: { type: "string" },
          visible: { type: "boolean" },
        },
        required: ["type"],
        description: "Gated project listing — always shown as a teaser to signed-out visitors, never fully indexed for chat.",
      },
      GithubLinkPayload: {
        type: "object",
        properties: {
          type: { const: "github_link" },
          id: { type: "string", format: "uuid" },
          label: { type: "string" },
          url: { type: "string" },
          sort_order: { type: "integer" },
          visible: { type: "boolean" },
        },
        required: ["type"],
      },
    },
  },
  paths: {
    "/api/admin/content": {
      post: {
        summary: "Publish or update content",
        security: [{ adminBearer: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/PostPayload" },
                  { $ref: "#/components/schemas/PaperPayload" },
                  { $ref: "#/components/schemas/BuildLogPayload" },
                  { $ref: "#/components/schemas/SiteContentPayload" },
                  { $ref: "#/components/schemas/NavLinkPayload" },
                  { $ref: "#/components/schemas/ServicePayload" },
                  { $ref: "#/components/schemas/ProjectPayload" },
                  { $ref: "#/components/schemas/GithubLinkPayload" },
                ],
                discriminator: { propertyName: "type" },
              },
            },
          },
        },
        responses: {
          "200": { description: "The upserted row, wrapped under a key matching its type (e.g. { post: {...} })." },
          "400": { description: "Missing/invalid fields for the given type." },
          "401": { description: "Missing or incorrect bearer token." },
          "429": { description: "Rate limited — 60 requests/minute, global across all callers." },
          "500": { description: "Database error." },
        },
      },
    },
    "/api/admin/audit-logs": {
      get: {
        summary: "Read the content audit log",
        security: [{ adminBearer: [] }],
        description:
          "Same content_audit_log table the admin UI's Audit log page and the public /agent-activity page read from, but authenticated and including entity_id.",
        parameters: [
          {
            name: "source",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: [
                "admin_ui",
                "site_agent",
                "research_agent",
                "dev_log_agent",
                "telegram_agent",
                "mcp_agent",
              ],
            },
            description: "Filter to one write path. Omit for all sources.",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 50, maximum: 200 },
            description: "Max rows to return.",
          },
        ],
        responses: {
          "200": {
            description:
              "{ entries: [{ id, source, action, entity_type, entity_id, summary, created_at }, ...] }",
          },
          "400": { description: "Invalid source value." },
          "401": { description: "Missing or incorrect bearer token." },
          "429": { description: "Rate limited — 60 requests/minute, global across all callers." },
        },
      },
    },
    "/api/chat": {
      post: {
        summary: "Ask the site's RAG chat widget a question",
        description:
          "Public, rate-limited to 15 requests/60s per IP. Answers are grounded in published content plus a few tools (availability, build-log stats, and notifying the site owner on the visitor's behalf).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string", maxLength: 500 },
                  history: {
                    type: "array",
                    description: "Prior turns, oldest first — needed for multi-turn flows like confirming before the widget contacts the site owner.",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["user", "assistant"] },
                        text: { type: "string" },
                      },
                    },
                  },
                },
                required: ["message"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "The assistant's answer plus any cited sources.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    answer: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          url_path: { type: "string" },
                          lastUpdatedBy: { type: "string", description: "Label of the write path that last touched this content (e.g. \"Admin UI\", \"Telegram agent\") — omitted if no audit-log entry is found." },
                          lastUpdatedAt: { type: "string", description: "Relative time string (e.g. \"2 days ago\") — omitted alongside lastUpdatedBy." },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": { description: "Chat is currently disabled in site content." },
          "429": { description: "Rate limited." },
          "502": { description: "Generation failed." },
        },
      },
    },
    "/api/telegram/webhook": {
      post: {
        summary: "Telegram webhook for the conversational admin agent",
        description:
          "Not for external callers — Telegram invokes this after setWebhook is registered. Documented for completeness. Requires both the X-Telegram-Bot-Api-Secret-Token header and a message from the allowlisted admin chat id; anything else is silently dropped with a 200.",
        responses: { "200": { description: "Always 200 once the secret-token check passes, whether or not the message was acted on." }, "401": { description: "Missing/incorrect secret token." } },
      },
    },
    "/api/cron/weekly-insight": {
      get: {
        summary: "Generate and archive the weekly homepage note",
        security: [{ cronBearer: [] }],
        description: "Scheduled Mondays 14:00 UTC. Also best-effort emails subscribers if newsletter sending is configured.",
        responses: { "200": { description: "{ ok, insight, newsletter }" }, "401": { description: "Missing/incorrect bearer token." } },
      },
    },
    "/api/cron/purge-agent-logs": {
      get: {
        summary: "Delete content_audit_log rows older than 7 days",
        security: [{ cronBearer: [] }],
        description: "Scheduled daily 05:00 UTC. Keeps the audit log — read by /agent-activity and the admin audit-log page — from growing unbounded.",
        responses: { "200": { description: "{ ok, deleted }" }, "401": { description: "Missing/incorrect bearer token." } },
      },
    },
    "/feed.xml": {
      get: { summary: "RSS 2.0 feed of published posts", responses: { "200": { description: "RSS XML", content: { "application/rss+xml": {} } } } },
    },
    "/build-log/feed.xml": {
      get: { summary: "RSS 2.0 feed of the build log", responses: { "200": { description: "RSS XML", content: { "application/rss+xml": {} } } } },
    },
    "/llms.txt": {
      get: { summary: "Plain-text content map for AI agents/crawlers", responses: { "200": { description: "Plain text", content: { "text/plain": {} } } } },
    },
    "/api/mcp": {
      post: {
        summary: "MCP server (Streamable HTTP) — tools for this site",
        description:
          "Not a REST endpoint — a Model Context Protocol server any MCP client can connect to. Public tools (search_content, get_build_log_stats, get_availability) need no auth; admin tools (list_site_content, update_site_content, add_testimonial, add_service — same set as the Telegram admin agent) unlock with either an adminBearer token or a valid OAuth access token from this site's own OAuth server (see the /api/mcp/{register,authorize,token} entries below), and are absent from tools/list entirely when neither is present. search_content accepts an optional site_only boolean to restrict results to posts about the site itself. See docs/API.md for client setup (Claude Desktop, Claude Code, claude.ai, etc.).",
        responses: { "200": { description: "JSON-RPC 2.0 response (MCP protocol), streamed as text/event-stream." } },
      },
    },
    "/api/mcp/register": {
      post: {
        summary: "OAuth dynamic client registration (RFC 7591)",
        description:
          "Part of the minimal OAuth server fronting /api/mcp's admin tier, for clients (like claude.ai's web connector UI) that can't send a raw bearer header. Open/unauthenticated — registering only issues a client_id, it grants no access on its own; an admin still has to approve the client at /api/mcp/authorize.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  redirect_uris: { type: "array", items: { type: "string" } },
                  client_name: { type: "string" },
                },
                required: ["redirect_uris"],
              },
            },
          },
        },
        responses: {
          "201": { description: "{ client_id, client_id_issued_at, redirect_uris, token_endpoint_auth_method: \"none\", grant_types, response_types }" },
          "400": { description: "Missing/invalid redirect_uris." },
        },
      },
    },
    "/api/mcp/authorize": {
      get: {
        summary: "OAuth authorization endpoint (renders HTML, not JSON)",
        description:
          "Requires response_type=code, a registered client_id + matching redirect_uri, and PKCE (code_challenge / code_challenge_method=S256). Gated by an admin session, not a bearer token — shows a sign-in form if absent, otherwise a one-click Allow/Deny consent screen for the named client. On approval, redirects to the client's redirect_uri with a single-use authorization code, later exchanged for a token at /api/mcp/token.",
        responses: {
          "200": { description: "Sign-in form, consent screen, or an error screen for a malformed/unregistered request — never redirects to an unverified redirect_uri." },
          "302": { description: "Redirect to redirect_uri with ?code=...&state=... (approved) or ?error=access_denied&state=... (denied)." },
        },
      },
    },
    "/api/mcp/token": {
      post: {
        summary: "OAuth token endpoint (RFC 6749)",
        description:
          "grant_type=authorization_code (with code, redirect_uri, client_id, code_verifier) exchanges a single-use code for tokens; grant_type=refresh_token (with refresh_token, client_id) rotates both tokens. No client secret — public clients only (token_endpoint_auth_method: \"none\").",
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": { schema: { type: "object" } },
          },
        },
        responses: {
          "200": { description: "{ access_token, refresh_token, token_type: \"Bearer\", expires_in, scope: \"admin\" } — access tokens last 90 days." },
          "400": { description: "invalid_request, invalid_grant, or unsupported_grant_type." },
        },
      },
    },
    "/.well-known/oauth-authorization-server": {
      get: {
        summary: "OAuth authorization server metadata (RFC 8414)",
        description: "Advertises the authorize/token/register endpoints above for OAuth-only MCP clients doing discovery.",
        responses: { "200": { description: "Authorization server metadata JSON." } },
      },
    },
    "/.well-known/oauth-protected-resource": {
      get: {
        summary: "OAuth protected-resource metadata (RFC 9728)",
        description: "Points /api/mcp at the authorization server above. Also served path-suffixed (e.g. /.well-known/oauth-protected-resource/api/mcp) for clients that look it up that way — same document either way, since this site has one protected resource.",
        responses: { "200": { description: "{ resource, authorization_servers }" } },
      },
    },
    "/sitemap.xml": {
      get: { summary: "Standard XML sitemap", responses: { "200": { description: "Sitemap XML", content: { "application/xml": {} } } } },
    },
  },
} as const;

export type ApiOperation = {
  summary: string;
  description?: string;
  security?: readonly Record<string, readonly unknown[]>[];
  responses: Record<string, { description: string }>;
};

// Flat, render-friendly view of openApiSpec.paths — one entry per
// method+path, in declaration order. Built once at module load rather than
// walked fresh in JSX, so the page component stays plain markup.
export const apiOperations: { path: string; method: string; op: ApiOperation }[] = Object.entries(
  openApiSpec.paths
).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({ path, method: method.toUpperCase(), op: op as ApiOperation }))
);
