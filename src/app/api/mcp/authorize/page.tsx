import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { randomToken, AUTH_CODE_TTL_MS } from "@/lib/mcp-oauth";
import AuthorizeLoginForm from "./authorize-login-form";

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-2xl">Can&apos;t authorize this request</h1>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}

type Params = Record<string, string | string[] | undefined>;

function str(params: Params, key: string): string | null {
  const v = params[key];
  return typeof v === "string" ? v : null;
}

export default async function McpAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const responseType = str(params, "response_type");
  const clientId = str(params, "client_id");
  const redirectUri = str(params, "redirect_uri");
  const state = str(params, "state");
  const codeChallenge = str(params, "code_challenge");
  const codeChallengeMethod = str(params, "code_challenge_method");

  if (responseType !== "code" || !clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== "S256") {
    return (
      <ErrorScreen message="Malformed authorization request — missing or unsupported OAuth parameters (this server only supports the authorization_code grant with PKCE S256)." />
    );
  }

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("mcp_oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  // Never redirect back to an unverified redirect_uri — that's the classic
  // open-redirect/token-theft failure mode this check exists to prevent.
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return <ErrorScreen message="Unknown client or unregistered redirect URI." />;
  }

  const admin = await requireAdmin();
  if (!admin) {
    return <AuthorizeLoginForm clientName={client.client_name} />;
  }

  // Re-bound to a locked string type — TS doesn't carry the `!redirectUri`
  // narrowing above into the nested "use server" closures below.
  const validRedirectUri: string = redirectUri;

  async function approve() {
    "use server";

    const supabase = createAdminClient();
    const { data: client } = await supabase
      .from("mcp_oauth_clients")
      .select("client_id, redirect_uris")
      .eq("client_id", clientId)
      .maybeSingle();
    if (!client || !client.redirect_uris.includes(validRedirectUri)) {
      throw new Error("Client/redirect URI no longer valid.");
    }

    const admin = await requireAdmin();
    if (!admin) {
      throw new Error("Not signed in.");
    }

    // Best-effort cleanup of expired, never-consumed codes.
    await supabase.from("mcp_oauth_codes").delete().lt("expires_at", new Date().toISOString());

    const code = randomToken(32);
    const { error } = await supabase.from("mcp_oauth_codes").insert({
      code,
      client_id: clientId,
      redirect_uri: validRedirectUri,
      code_challenge: codeChallenge,
      admin_id: admin.user.id,
      expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
    });
    if (error) throw new Error(error.message);

    const url = new URL(validRedirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    redirect(url.toString());
  }

  async function deny() {
    "use server";
    const url = new URL(validRedirectUri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    redirect(url.toString());
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-2xl">Authorize {client.client_name ?? "this app"}</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as {admin.user.email}. {client.client_name ?? "This app"} is
        asking for admin access to damienkedwardstech — the same tools
        available to the Telegram admin agent (edit site content, add
        testimonials, add service cards).
      </p>
      <div className="mt-8 flex gap-3">
        <form action={approve}>
          <button className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground">
            Allow
          </button>
        </form>
        <form action={deny}>
          <button className="rounded-sm border border-line px-4 py-2 text-sm text-muted hover:text-fg">
            Deny
          </button>
        </form>
      </div>
    </div>
  );
}
