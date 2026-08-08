import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/site-content";

export default async function ProjectsIndexPage() {
  const supabase = await createClient();
  const [{ data: projects }, content] = await Promise.all([
    supabase
      .from("site_projects")
      .select("name, description, url")
      .eq("visible", true)
      .order("sort_order", { ascending: true }),
    getSiteContent(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-term-fg-dim text-sm">$ ./projects --list</p>
      <h1 className="mt-2 text-xl">
        access granted<span className="cursor" />
      </h1>

      {content.projects_github_url && (
        <a
          href={content.projects_github_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-term-fg hover:text-term-cursor"
        >
          [ github ] →
        </a>
      )}

      <p className="mt-8 text-xs uppercase tracking-[0.2em] text-term-fg-dim">
        ── projects ──
      </p>

      <ul className="mt-3 divide-y divide-term-fg-dim">
        {(projects ?? []).map((p) => (
          <li key={p.name} className="py-4">
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="text-term-fg hover:text-term-cursor"
            >
              [ {p.name} ] →
            </a>
            {p.description && (
              <p className="mt-1 text-sm opacity-80">{p.description}</p>
            )}
          </li>
        ))}
        {(!projects || projects.length === 0) && (
          <li className="py-4 text-sm opacity-70">Nothing listed yet.</li>
        )}
      </ul>
    </div>
  );
}
