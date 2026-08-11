import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Registration (POST /api/mcp/register) happens for any connecting client
// during the MCP handshake, including ones that only ever use the public,
// no-auth tier — not just clients that go on to complete the admin-tier
// OAuth flow. Counting distinct client_ids is a legitimate "N AI clients
// have connected" proxy. mcp_oauth_clients has no public RLS policy (see
// supabase/migrations/0022_mcp_oauth.sql), so this must run server-side.
export const getMcpClientCount = cache(async (): Promise<number> => {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("mcp_oauth_clients")
    .select("client_id", { count: "exact", head: true });
  return count ?? 0;
});
