import { NextResponse, type NextRequest } from "next/server";

// RFC 8414 authorization server metadata for the minimal OAuth server
// fronting /api/mcp's admin tier (see src/app/api/mcp/{authorize,token,register}).
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/authorize`,
    token_endpoint: `${origin}/api/mcp/token`,
    registration_endpoint: `${origin}/api/mcp/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["admin"],
  });
}
