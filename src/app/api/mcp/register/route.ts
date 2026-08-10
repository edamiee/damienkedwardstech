import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken } from "@/lib/mcp-oauth";

// RFC 7591 dynamic client registration — deliberately open (no auth). This
// only ever hands out a client_id; it grants no access on its own. Actual
// access still requires an admin to complete /api/mcp/authorize for that
// specific client_id, so an attacker registering clients here gains
// nothing beyond a client_id that no admin has approved.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestTimestamps.push(now);
  return requestTimestamps.length > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  if (isRateLimited()) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }

  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: "Invalid JSON body." }, { status: 400 });
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === "string") : [];
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array of strings." },
      { status: 400 }
    );
  }
  for (const uri of redirectUris) {
    try {
      new URL(uri);
    } catch {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: `"${uri}" is not a valid URL.` },
        { status: 400 }
      );
    }
  }

  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 200) : null;
  const clientId = randomToken(16);

  const supabase = createAdminClient();
  const { error } = await supabase.from("mcp_oauth_clients").insert({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
  });
  if (error) {
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName ?? undefined,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201 }
  );
}
