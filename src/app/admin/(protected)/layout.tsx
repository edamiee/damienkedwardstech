import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

// Guards everything under /admin (except /admin/login). Two checks: is
// there a logged-in Supabase Auth user at all (middleware.ts already
// redirects the obvious case, this is belt-and-suspenders for direct
// server-side hits), and is that user present in public.admins — the same
// table the arcade app's admin login checks, since both apps share one
// Supabase project.
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow) {
    redirect("/admin/login?error=not_admin");
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Link href="/admin" className="font-display text-lg">
            damienkedwardstech — Admin
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="truncate text-sm text-muted">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
