import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ count: postCount }, { count: paperCount }, { count: viewerCount }, { count: projectCount }] =
    await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("papers").select("id", { count: "exact", head: true }),
      supabase
        .from("project_viewer_invites")
        .select("email", { count: "exact", head: true }),
      supabase.from("site_projects").select("id", { count: "exact", head: true }),
    ]);

  const sections = [
    { href: "/admin/posts", label: "Blog posts", count: postCount },
    { href: "/admin/papers", label: "Writing / documents", count: paperCount },
    { href: "/admin/viewers", label: "Project viewer invites", count: viewerCount },
    { href: "/admin/projects", label: "Gated projects", count: projectCount },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Dashboard</h1>

      <Link
        href="/admin/content"
        className="mt-6 flex items-center justify-between rounded-sm border border-line bg-surface px-5 py-4 hover:border-teal"
      >
        <div>
          <p className="font-medium">Homepage &amp; About content</p>
          <p className="mt-0.5 text-sm text-muted">
            Edit the hero headline, subheading, and About page copy.
          </p>
        </div>
        <span className="text-teal">Edit →</span>
      </Link>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-sm border border-line bg-surface px-5 py-4 hover:border-teal"
          >
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 font-data text-2xl">{s.count ?? 0}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        Content can also be created remotely via{" "}
        <code className="font-data">POST /api/admin/content</code> using the{" "}
        <code className="font-data">ADMIN_API_SECRET</code> bearer token —
        the route Hermes or a Claude API call can hit directly.
      </p>
    </div>
  );
}
