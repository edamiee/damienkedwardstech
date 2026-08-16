import { createMcpHandler, McpServer, type AuthInfo, type McpServerFactory } from "@modelcontextprotocol/server";
import { z } from "zod";
import { searchContent } from "@/lib/content-search";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteContent } from "@/lib/site-content";
import { ADMIN_AGENT_TOOLS, executeAdminAgentTool } from "@/lib/admin-agent-tools";
import { logContentChange } from "@/lib/audit-log";
import { VENDORS, PATTERN_CATEGORIES, VENDOR_LABELS, searchPipelinePatterns } from "@/lib/research-findings";

// Remote MCP server (Streamable HTTP, stateless — a fresh McpServer instance
// per request, matching Vercel's serverless model) exposing this site as
// tools any MCP-speaking client can use.
//
// Two tiers, gated by whether the request carries a valid bearer token:
//   - Public (always registered): search_content, get_build_log_stats,
//     get_availability — read-only, safe for any MCP client to call.
//   - Admin (only registered when the bearer token is either the static
//     ADMIN_API_SECRET or a valid, unexpired mcp_oauth_tokens access token):
//     the same curated write tools already used by the Telegram admin agent
//     (see src/lib/admin-agent-tools.ts) — list_site_content,
//     update_site_content, add_testimonial, add_service. Unauthenticated
//     callers never see these in tools/list.
//
// The OAuth path exists for clients (claude.ai's web connector UI) that
// only support OAuth, not a raw bearer header — see
// src/app/api/mcp/{authorize,token,register}/route.ts and the discovery
// documents under src/app/.well-known/.
//
// See docs/API.md and /openapi.json for the REST-shaped sibling of this
// endpoint, and the setup instructions given alongside this file for how to
// point Claude Desktop / another MCP client at it.
//
// Every public tool call also gets logged (source "mcp_client", distinct
// from the already-logged "mcp_agent" admin writes) so the live demo shows
// up on /agent-activity the same way every other write path does.
//
// Each public tool also checks its own site_content flag
// (mcp_search_enabled / mcp_availability_enabled /
// mcp_build_log_stats_enabled, editable at /admin/content) before
// registering — a tool that's off simply isn't in tools/list and
// tools/call for it returns the standard "unknown tool" error, for every
// caller (the /mcp-demo page and real MCP clients alike), not just the demo.

function truncate(text: string, max = 150): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const RATE_LIMIT = 60; // requests
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestTimestamps.push(now);
  return requestTimestamps.length > RATE_LIMIT;
}

async function extractAuthInfo(request: Request): Promise<AuthInfo | undefined> {
  const secret = process.env.ADMIN_API_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return undefined;

  if (secret && token === secret) {
    return { token, clientId: "mcp-admin-secret", scopes: ["admin"] };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("mcp_oauth_tokens")
    .select("client_id, expires_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!data || new Date(data.expires_at).getTime() < Date.now()) return undefined;
  return { token, clientId: data.client_id, scopes: ["admin"] };
}

const factory: McpServerFactory = async (ctx) => {
  const server = new McpServer({ name: "damienkedwardstech", version: "1.0.0" });
  const siteContent = await getSiteContent();

  if (siteContent.mcp_search_enabled !== "false") {
    server.registerTool(
      "search_content",
      {
        title: "Search site content",
        description:
          "Semantic search over everything published on damienkedwards.tech — posts, papers, build log entries, and gated-project teasers. Returns titles, URLs, and a ~600-character excerpt for each match, ranked by relevance to the query.",
        inputSchema: z.object({
          query: z.string().describe("What to search for, in natural language."),
          site_only: z
            .boolean()
            .optional()
            .describe(
              "If true, restrict results to posts about damienkedwardstech/the arcade itself, excluding posts on other topics."
            ),
        }),
      },
      async ({ query, site_only }) => {
        const results = await searchContent(query, 12, 600, site_only ?? false);
        await logContentChange({
          source: "mcp_client",
          action: "mcp.search_content",
          entity_type: "mcp_tool_call",
          summary: `MCP client searched for "${truncate(query)}"${site_only ? " (site only)" : ""} — ${results.length} result${results.length === 1 ? "" : "s"}`,
        });
        if (results.length === 0) {
          return { content: [{ type: "text", text: "No matches." }] };
        }
        const text = results
          .map((r) => `[${r.kind}] ${r.title} — https://damienkedwards.tech${r.url_path}\n${r.snippet}`)
          .join("\n\n");
        return { content: [{ type: "text", text }] };
      }
    );
  }

  if (siteContent.mcp_build_log_stats_enabled !== "false") {
    server.registerTool(
      "get_build_log_stats",
      {
        title: "Get build log stats",
        description:
          "Get the measurable outcome stats for one of Damien's build log entries by its slug (slugs appear at the end of a build log URL, e.g. /build-log/site-agent -> slug 'site-agent').",
        inputSchema: z.object({ slug: z.string() }),
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("case_studies")
          .select("stats")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        const stats = (data?.stats ?? []) as { value: string; label: string }[];
        const text = stats.length === 0 ? "No stats recorded for that build log entry." : stats.map((s) => `${s.value} ${s.label}`).join("; ");
        await logContentChange({
          source: "mcp_client",
          action: "mcp.get_build_log_stats",
          entity_type: "mcp_tool_call",
          summary: `MCP client looked up build log stats for "${truncate(slug)}"`,
        });
        return { content: [{ type: "text", text }] };
      }
    );
  }

  if (siteContent.mcp_availability_enabled !== "false") {
    server.registerTool(
      "get_availability",
      {
        title: "Get availability",
        description: "Check Damien's current availability status and preferred contact info.",
        inputSchema: z.object({}),
      },
      async () => {
        await logContentChange({
          source: "mcp_client",
          action: "mcp.get_availability",
          entity_type: "mcp_tool_call",
          summary: "MCP client checked availability",
        });
        return {
          content: [
            {
              type: "text",
              text: `Now: ${siteContent.now_line || "no status set"}. Contact: ${siteContent.contact_email}.`,
            },
          ],
        };
      }
    );
  }

  if (siteContent.mcp_pipeline_patterns_enabled !== "false") {
    server.registerTool(
      "search_pipeline_patterns",
      {
        title: "Search pipeline & warehouse patterns",
        description:
          "Search curated findings about genuine architectural patterns across Snowflake, Databricks, dbt, Spark, Qlik, Redshift, MS Fabric, and n8n — incremental modeling, semantic layers, orchestration, cost optimization, and similar. Filtered from vendor marketing by a review pipeline; every result is human-approved. Filter by vendor and/or pattern_category, optionally re-ranked by a free-text query.",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("Free-text relevance query, e.g. 'incremental models'. Optional."),
          vendor: z.enum(VENDORS).optional(),
          pattern_category: z.enum(PATTERN_CATEGORIES).optional(),
          since: z
            .string()
            .optional()
            .describe("ISO date (YYYY-MM-DD) — only findings found on or after this date."),
        }),
      },
      async ({ query, vendor, pattern_category, since }) => {
        const results = await searchPipelinePatterns({ query, vendor, pattern_category, since });
        await logContentChange({
          source: "mcp_client",
          action: "mcp.search_pipeline_patterns",
          entity_type: "mcp_tool_call",
          summary: `MCP client searched pipeline patterns${vendor ? ` (${vendor})` : ""}${query ? ` for "${truncate(query)}"` : ""} — ${results.length} result${results.length === 1 ? "" : "s"}`,
        });
        if (results.length === 0) {
          return { content: [{ type: "text", text: "No matching findings." }] };
        }
        const text = results
          .map(
            (r) =>
              `[${VENDOR_LABELS[r.vendor]} · ${r.pattern_category}] ${r.title} — https://damienkedwards.tech/research/${r.slug}\n${r.why_it_matters}`
          )
          .join("\n\n");
        return { content: [{ type: "text", text }] };
      }
    );
  }

  // Admin tier: only visible/callable to a caller who supplied a valid
  // ADMIN_API_SECRET bearer token (checked before this factory ever runs —
  // see extractAuthInfo below). Reuses the exact same tool set and
  // executor already serving the Telegram admin agent.
  if (ctx.authInfo?.scopes?.includes("admin")) {
    for (const tool of ADMIN_AGENT_TOOLS) {
      const props = (tool.input_schema as { properties?: Record<string, { enum?: string[] }> }).properties ?? {};
      const required = new Set(
        ((tool.input_schema as { required?: string[] }).required ?? []) as string[]
      );
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, schema] of Object.entries(props)) {
        const field = schema.enum ? z.enum(schema.enum as [string, ...string[]]) : z.string();
        shape[key] = required.has(key) ? field : field.optional();
      }
      server.registerTool(
        tool.name,
        { title: tool.name, description: tool.description, inputSchema: z.object(shape) },
        async (input) => {
          const text = await executeAdminAgentTool(tool.name, input as Record<string, unknown>, "mcp_agent");
          return { content: [{ type: "text", text }] };
        }
      );
    }
  }

  return server;
};

const handler = createMcpHandler(factory, {
  onerror: (error) => console.error("mcp handler error", error),
});

async function handle(request: Request): Promise<Response> {
  if (isRateLimited()) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }
  return handler.fetch(request, { authInfo: await extractAuthInfo(request) });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
