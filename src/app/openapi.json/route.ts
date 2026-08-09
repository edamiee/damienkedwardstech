import { NextResponse } from "next/server";

const BASE_URL = "https://damienkedwards.tech";

// Machine-readable sibling to /llms.txt: that file tells an agent what's
// on this site, this one tells it what it can *do* to the site — the
// same content API documented in docs/API.md, in a shape a tool can
// actually parse rather than just read.
const spec = {
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
          published: { type: "boolean", default: false },
          publish_at: { type: "string", format: "date-time", description: "Delays visibility until this time, everywhere on the site, without further action." },
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
      CaseStudyPayload: {
        type: "object",
        properties: {
          type: { const: "case_study" },
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
              "uncharted_heading", "uncharted_body", "weekly_ai_insight", "about_body",
              "about_skills", "resume_url", "footer_tagline", "contact_intro", "contact_email",
              "contact_linkedin", "chat_enabled", "chat_header", "chat_subheader",
              "chat_example_question", "newsletter_capture_enabled",
              "newsletter_sending_enabled", "newsletter_from_email", "testimonials_enabled",
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
                  { $ref: "#/components/schemas/CaseStudyPayload" },
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
    "/api/chat": {
      post: {
        summary: "Ask the site's RAG chat widget a question",
        description:
          "Public, rate-limited to 15 requests/60s per IP. Answers are grounded in published content plus a few tools (availability, case-study stats, and notifying the site owner on the visitor's behalf).",
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
                        properties: { title: { type: "string" }, url_path: { type: "string" } },
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
    "/feed.xml": {
      get: { summary: "RSS 2.0 feed of published posts", responses: { "200": { description: "RSS XML", content: { "application/rss+xml": {} } } } },
    },
    "/case-studies/feed.xml": {
      get: { summary: "RSS 2.0 feed of published case studies", responses: { "200": { description: "RSS XML", content: { "application/rss+xml": {} } } } },
    },
    "/llms.txt": {
      get: { summary: "Plain-text content map for AI agents/crawlers", responses: { "200": { description: "Plain text", content: { "text/plain": {} } } } },
    },
    "/api/mcp": {
      post: {
        summary: "MCP server (Streamable HTTP) — tools for this site",
        description:
          "Not a REST endpoint — a Model Context Protocol server any MCP client can connect to. Public tools (search_content, get_case_study_stats, get_availability) need no auth; admin tools (list_site_content, update_site_content, add_testimonial, add_service — same set as the Telegram admin agent) require an adminBearer token, and are absent from tools/list entirely when it's missing or wrong. See docs/API.md for client setup (Claude Desktop, Claude Code, etc.).",
        responses: { "200": { description: "JSON-RPC 2.0 response (MCP protocol), streamed as text/event-stream." } },
      },
    },
    "/sitemap.xml": {
      get: { summary: "Standard XML sitemap", responses: { "200": { description: "Sitemap XML", content: { "application/xml": {} } } } },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
