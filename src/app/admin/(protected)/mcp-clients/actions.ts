"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

// Deletes the client registration outright rather than just its tokens —
// mcp_oauth_tokens and mcp_oauth_codes both reference client_id with
// on-delete-cascade (see supabase/migrations/0022_mcp_oauth.sql), so this
// revokes every live token in one step. Registration is unauthenticated by
// design, so the client can always re-register and go through
// /api/mcp/authorize again if it's meant to be there.
export async function revokeClient(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorized");

  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!clientId) return;

  await admin.supabase.from("mcp_oauth_clients").delete().eq("client_id", clientId);
  revalidatePath("/admin/mcp-clients");
}
