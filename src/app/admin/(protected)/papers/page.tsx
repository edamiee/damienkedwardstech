import { createClient } from "@/lib/supabase/server";
import { savePaper, deletePaper } from "./actions";

export default async function AdminPapersPage() {
  const supabase = await createClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, title, description, url, published")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Writing / documents</h1>
      <p className="mt-1 text-sm text-muted">
        External links — writeups, case studies, research notes hosted
        elsewhere. Shown alongside blog posts on the Writing page.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(papers ?? []).map((paper) => (
          <form
            key={paper.id}
            action={savePaper}
            className="flex flex-col gap-2 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={paper.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="title"
                defaultValue={paper.title}
                className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
              />
              <input
                name="url"
                defaultValue={paper.url}
                className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
              />
            </div>
            <input
              name="description"
              defaultValue={paper.description ?? ""}
              placeholder="One-line description"
              className="rounded-sm border border-line bg-bg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={paper.published} />
                Published
              </label>
              <button
                type="submit"
                className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-bg"
              >
                Save
              </button>
              <button formAction={deletePaper} className="text-sm text-rust">
                Delete
              </button>
            </div>
          </form>
        ))}
        {(!papers || papers.length === 0) && (
          <p className="text-sm text-muted">Nothing added yet.</p>
        )}
      </div>

      <form
        action={savePaper}
        className="mt-6 flex flex-col gap-3 rounded-sm border border-dashed border-line p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            placeholder="Title"
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
          <input type="checkbox" name="published" defaultChecked />
          Published
        </label>
        <button
          type="submit"
          className="self-start rounded-sm border border-teal px-4 py-2 text-sm font-semibold text-teal"
        >
          Add document
        </button>
      </form>
    </div>
  );
}
