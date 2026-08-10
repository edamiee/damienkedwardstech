import { createMcpHandler, McpServer, type AuthInfo, type McpServerFactory } from "@modelcontextprotocol/server";
import { z } from "zod";
import { searchContent } from "@/lib/content-search";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteContent } from "@/lib/site-content";
import { ADMIN_AGENT_TOOLS, executeAdminAgentTool } from "@/lib/admin-agent-tools";

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
      if (results.length === 0) {
        return { content: [{ type: "text", text: "No matches." }] };
      }
      const text = results
        .map((r) => `[${r.kind}] ${r.title} — https://damienkedwards.tech${r.url_path}\n${r.snippet}`)
        .join("\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

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
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "get_availability",
    {
      title: "Get availability",
      description: "Check Damien's current availability status and preferred contact info.",
      inputSchema: z.object({}),
    },
    async () => {
      const content = await getSiteContent();
      return {
        content: [
          {
            type: "text",
            text: `Now: ${content.now_line || "no status set"}. Contact: ${content.contact_email}.`,
          },
        ],
      };
    }
  );

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
