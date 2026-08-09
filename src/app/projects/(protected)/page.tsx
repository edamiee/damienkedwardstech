import { createClient } from "@/lib/supabase/server";
import { getGithubLinks } from "@/lib/github-links";

export default async function ProjectsIndexPage() {
  const supabase = await createClient();
  const [{ data: projects }, githubLinks] = await Promise.all([
    supabase
      .from("site_projects")
      .select("name, description, url, image_url")
      .eq("visible", true)
      .order("sort_order", { ascending: true }),
    getGithubLinks(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-term-fg-dim text-sm">$ ./projects --list</p>
      <h1 className="mt-2 text-xl">
        access granted<span className="cursor" />
      </h1>

      {githubLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {githubLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-term-fg hover:text-term-cursor"
            >
              [ {link.label} ] →
            </a>
          ))}
        </div>
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
            {p.image_url && (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="scanlines relative mt-3 block w-full max-w-sm overflow-hidden border border-term-fg-dim"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external screenshot URLs, not worth remotePatterns config */}
                <img
                  src={p.image_url}
                  alt={`${p.name} screenshot`}
                  loading="lazy"
                  className="block h-40 w-full object-cover opacity-90 grayscale-[15%] contrast-125"
                />
              </a>
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
