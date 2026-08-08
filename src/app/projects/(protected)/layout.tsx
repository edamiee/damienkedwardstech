import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProjectViewer } from "@/lib/require-project-viewer";

// Guards everything under /projects (except /projects/login). Access is
// admin OR an invited email in public.project_viewer_invites — see
// requireProjectViewer for the full check.
export default async function ProtectedProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireProjectViewer();
  if (!viewer) {
    redirect("/projects/login");
  }

  return (
    <div className="theme-terminal scanlines min-h-screen">
      <header className="flex items-center justify-between border-b border-term-fg-dim px-6 py-4 text-sm">
        <Link href="/projects">guest@dke:~/projects$</Link>
        <div className="flex items-center gap-4">
          <span className="text-term-fg-dim">{viewer.user.email}</span>
          <Link href="/" className="text-term-alert">
            ← back to site
          </Link>
        </div>
      </header>
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
