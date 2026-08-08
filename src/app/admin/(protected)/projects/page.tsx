import { createClient } from "@/lib/supabase/server";
import { saveProject, deleteProject } from "./actions";

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("site_projects")
    .select("id, name, description, url, visible")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Gated projects</h1>
      <p className="mt-1 text-sm text-muted">
        Listed at /projects for signed-in admins and invited viewers — e.g.
        the Arcade game, and whatever you add next.
      </p>

      <form action={saveProject} className="mt-6 flex flex-col gap-3 rounded-sm border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
          />
          <input
            name="url"
            placeholder="https://…"
            required
            className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
        <input
          name="description"
          placeholder="One-line description"
          className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked />
          Visible
        </label>
        <button
          type="submit"
          className="self-start rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg"
        >
          Add
        </button>
      </form>

      <ul className="mt-6 divide-y divide-line">
        {(projects ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <a href={p.url} target="_blank" rel="noreferrer" className="font-medium hover:text-teal">
                {p.name}
              </a>
              <p className="mt-0.5 text-xs text-muted">
                {p.visible ? "Visible" : "Hidden"}
                {p.description ? ` · ${p.description}` : ""}
              </p>
            </div>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-sm text-rust">Delete</button>
            </form>
          </li>
        ))}
        {(!projects || projects.length === 0) && (
          <li className="py-4 text-sm text-muted">Nothing added yet.</li>
        )}
      </ul>
    </div>
  );
}
