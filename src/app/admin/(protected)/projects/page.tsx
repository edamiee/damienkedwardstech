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

      <div className="mt-6 flex flex-col gap-3">
        {(projects ?? []).map((p) => (
          <form
            key={p.id}
            action={saveProject}
            className="flex flex-col gap-2 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                defaultValue={p.name}
                className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
              />
              <input
                name="url"
                defaultValue={p.url}
                className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
              />
            </div>
            <input
              name="description"
              defaultValue={p.description ?? ""}
              placeholder="One-line description"
              className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visible" defaultChecked={p.visible} />
                Visible
              </label>
              <button
                type="submit"
                className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-bg"
              >
                Save
              </button>
              <button formAction={deleteProject} className="text-sm text-rust">
                Delete
              </button>
            </div>
          </form>
        ))}
        {(!projects || projects.length === 0) && (
          <p className="text-sm text-muted">Nothing added yet.</p>
        )}
      </div>

      <form
        action={saveProject}
        className="mt-6 flex flex-col gap-3 rounded-sm border border-dashed border-line p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded-sm border border-line bg-surface px-3 py-2 text-sm"
          />
          <input
            name="url"
            placeholder="https://…"
            required
            className="rounded-sm border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        <input
          name="description"
          placeholder="One-line description"
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked />
          Visible
        </label>
        <button
          type="submit"
          className="self-start rounded-sm border border-teal px-4 py-2 text-sm font-semibold text-teal"
        >
          Add project
        </button>
      </form>
    </div>
  );
}
