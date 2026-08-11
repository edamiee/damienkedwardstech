import { createClient } from "@/lib/supabase/server";
import { revokeClient } from "./actions";
import { formatRelativeTime, isPast } from "@/lib/format-relative-time";

type OAuthClient = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  created_at: string;
};

type OAuthToken = {
  client_id: string;
  created_at: string;
  expires_at: string;
};

export default async function AdminMcpClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: tokens }] = await Promise.all([
    supabase
      .from("mcp_oauth_clients")
      .select("client_id, client_name, redirect_uris, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("mcp_oauth_tokens").select("client_id, created_at, expires_at"),
  ]);

  const tokensByClient = new Map<string, OAuthToken[]>();
  for (const t of (tokens ?? []) as OAuthToken[]) {
    const list = tokensByClient.get(t.client_id) ?? [];
    list.push(t);
    tokensByClient.set(t.client_id, list);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">MCP-connected clients</h1>
      <p className="mt-1 text-sm text-muted">
        Apps that registered against <code className="font-data">/api/mcp/register</code> and
        may hold a token for the MCP admin tier (issued via{" "}
        <code className="font-data">/api/mcp/authorize</code>, gated by your own admin login).
        Registration itself is unauthenticated by design and grants no access —
        this list is what actually matters. Revoking removes the client and
        every token it holds; it can always come back through
        the sign-in flow again.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {(clients ?? []).map((c: OAuthClient) => {
          const clientTokens = tokensByClient.get(c.client_id) ?? [];
          const activeTokens = clientTokens.filter((t) => !isPast(t.expires_at));
          const mostRecentToken = clientTokens
            .slice()
            .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0];

          return (
            <li key={c.client_id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold">
                  {c.client_name || "Unnamed client"}
                </p>
                <p className="mt-0.5 font-data text-[11px] text-muted">{c.client_id}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {activeTokens.length > 0
                    ? `${activeTokens.length} active token${activeTokens.length === 1 ? "" : "s"}`
                    : clientTokens.length > 0
                      ? "Token(s) expired — not currently connected"
                      : "Registered, never completed sign-in"}
                  {mostRecentToken &&
                    ` · last connected ${formatRelativeTime(mostRecentToken.created_at)}`}
                  {" · registered "}
                  {formatRelativeTime(c.created_at)}
                </p>
                {c.redirect_uris?.length > 0 && (
                  <p className="mt-1 truncate font-data text-[11px] text-muted">
                    → {c.redirect_uris[0]}
                  </p>
                )}
              </div>
              <form action={revokeClient}>
                <input type="hidden" name="client_id" value={c.client_id} />
                <button className="whitespace-nowrap text-sm text-rust hover:underline">
                  Revoke
                </button>
              </form>
            </li>
          );
        })}
        {(!clients || clients.length === 0) && (
          <li className="py-4 text-sm text-muted">No clients have registered yet.</li>
        )}
      </ul>
    </div>
  );
}
