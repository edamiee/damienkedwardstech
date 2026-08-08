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

      <form action={savePaper} className="mt-6 flex flex-col gap-3 rounded-sm border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            placeholder="Title"
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
          <input type="checkbox" name="published" defaultChecked />
          Published
        </label>
        <button
          type="submit"
          className="self-start rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg"
        >
          Add
        </button>
      </form>

      <ul className="mt-6 divide-y divide-line">
        {(papers ?? []).map((paper) => (
          <li key={paper.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <a href={paper.url} target="_blank" rel="noreferrer" className="font-medium hover:text-teal">
                {paper.title}
              </a>
              <p className="mt-0.5 text-xs text-muted">
                {paper.published ? "Published" : "Draft"}
              </p>
            </div>
            <form action={deletePaper}>
              <input type="hidden" name="id" value={paper.id} />
              <button className="text-sm text-rust">Delete</button>
            </form>
          </li>
        ))}
        {(!papers || papers.length === 0) && (
          <li className="py-4 text-sm text-muted">Nothing added yet.</li>
        )}
      </ul>
    </div>
  );
}
