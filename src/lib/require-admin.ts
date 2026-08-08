import "server-only";
import { createClient } from "@/lib/supabase/server";

// Shared guard for admin routes/API handlers: confirms the request's cookie
// session belongs to a logged-in Supabase Auth user who is also present in
// public.admins — the same table and the same account used by the arcade
// app's admin login, since both apps share one Supabase project.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow) return null;

  return { user, supabase };
}
