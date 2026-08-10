import { NextResponse, type NextRequest } from "next/server";

// RFC 9728 protected-resource metadata, pointing MCP clients at the
// authorization server above. Registered as an optional catch-all since
// clients look this up both at the bare well-known path and suffixed with
// the resource's own path (e.g. /oauth-protected-resource/api/mcp) — this
// site only has the one protected resource, so both resolve to the same
// document.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
  });
}
