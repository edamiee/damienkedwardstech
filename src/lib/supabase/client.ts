import { createBrowserClient } from "@supabase/ssr";

// Browser client — public URL + anon key only. This project shares its
// Supabase backend with the arcade app (Class_app-web/web), so the same
// admin login and the same public.admins table work here too.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
