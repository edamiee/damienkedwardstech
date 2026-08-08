import "server-only";
import { createClient } from "@/lib/supabase/server";

// Guard for the gated /projects area. Access is granted to:
//   - the admin (Damien, via public.admins — same account as arcade admin)
//   - anyone in public.project_viewer_invites (people explicitly invited to
//     view the gated projects, keyed by email since they may not have
//     signed in yet when the admin adds them, matched against the signed-in
//     user's email on their first magic-link sign-in)
export async function requireProjectViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const [{ data: adminRow }, { data: viewerRow }] = await Promise.all([
    supabase.from("admins").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("project_viewer_invites")
      .select("email")
      .eq("email", user.email.toLowerCase())
      .maybeSingle(),
  ]);

  if (!adminRow && !viewerRow) return null;

  return { user, isAdmin: Boolean(adminRow), supabase };
}
