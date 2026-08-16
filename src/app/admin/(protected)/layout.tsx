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

  const sections = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/content", label: "Site content" },
    { href: "/admin/posts", label: "Posts" },
    { href: "/admin/build-log", label: "Build log" },
    { href: "/admin/papers", label: "Writing / docs" },
    { href: "/admin/nav", label: "Navigation" },
    { href: "/admin/services", label: '"What I do"' },
    { href: "/admin/testimonials", label: "Testimonials" },
    { href: "/admin/projects", label: "Gated projects" },
    { href: "/admin/github-links", label: "GitHub repos" },
    { href: "/admin/viewers", label: "Viewer invites" },
    { href: "/admin/contact-messages", label: "Messages" },
    { href: "/admin/subscribers", label: "Subscribers" },
    { href: "/admin/chat-index", label: "Chat index" },
    { href: "/admin/topics", label: "Reader topics" },
    { href: "/admin/research-findings", label: "Research findings" },
    { href: "/admin/research-sources", label: "Research sources" },
    { href: "/admin/mcp-clients", label: "MCP clients" },
    { href: "/admin/content-health", label: "Content health" },
    { href: "/admin/audit-log", label: "Audit log" },
  ];

  return (
    <div className="min-h-screen bg-ground text-fg">
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
      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line bg-surface px-4 py-3 text-sm sm:px-6">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="text-teal hover:underline">
            {s.label}
          </Link>
        ))}
      </nav>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
