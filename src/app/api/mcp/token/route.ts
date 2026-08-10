import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken, verifyPkce, ACCESS_TOKEN_TTL_MS } from "@/lib/mcp-oauth";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestTimestamps.push(now);
  return requestTimestamps.length > RATE_LIMIT;
}

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    return new URLSearchParams(body);
  }
  const text = await request.text();
  return new URLSearchParams(text);
}

function issueTokens() {
  return {
    access_token: randomToken(32),
    refresh_token: randomToken(32),
    expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
  };
}

export async function POST(request: NextRequest) {
  if (isRateLimited()) {
    return NextResponse.json({ error: "slow_down" }, { status: 429 });
  }

  const params = await readParams(request);
  const grantType = params.get("grant_type");
  const supabase = createAdminClient();

  if (grantType === "authorization_code") {
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const { data: authCode } = await supabase
      .from("mcp_oauth_codes")
      .select("code, client_id, redirect_uri, code_challenge, admin_id, expires_at")
      .eq("code", code)
      .maybeSingle();

    // Consume immediately (single-use) regardless of outcome, so a leaked
    // code can't be replayed even after a failed exchange attempt.
    if (authCode) {
      await supabase.from("mcp_oauth_codes").delete().eq("code", code);
    }

    if (
      !authCode ||
      authCode.client_id !== clientId ||
      authCode.redirect_uri !== redirectUri ||
      new Date(authCode.expires_at).getTime() < Date.now() ||
      !verifyPkce(codeVerifier, authCode.code_challenge)
    ) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    const tokens = issueTokens();
    const { error } = await supabase.from("mcp_oauth_tokens").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      client_id: clientId,
      admin_id: authCode.admin_id,
      expires_at: tokens.expires_at,
    });
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: "admin",
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    const clientId = params.get("client_id");
    if (!refreshToken || !clientId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("mcp_oauth_tokens")
      .select("access_token, client_id, admin_id")
      .eq("refresh_token", refreshToken)
      .maybeSingle();

    if (!existing || existing.client_id !== clientId) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    // Rotate: the old refresh token (and its access token) dies with this
    // exchange, matching standard refresh-token-rotation practice.
    await supabase.from("mcp_oauth_tokens").delete().eq("access_token", existing.access_token);

    const tokens = issueTokens();
    const { error } = await supabase.from("mcp_oauth_tokens").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      client_id: clientId,
      admin_id: existing.admin_id,
      expires_at: tokens.expires_at,
    });
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: "admin",
    });
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
