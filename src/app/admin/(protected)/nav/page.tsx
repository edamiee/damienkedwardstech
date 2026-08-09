import { createClient } from "@/lib/supabase/server";
import { saveNavLink, deleteNavLink } from "./actions";

export default async function AdminNavPage() {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("nav_links")
    .select("id, label, href, sort_order, visible")
    .order("sort_order", { ascending: true });

  const nextOrder = (links?.length ?? 0) * 10;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Navigation</h1>
      <p className="mt-1 text-sm text-muted">
        Shown left-to-right in the header, in order. The link pointing to{" "}
        <code className="font-data">/projects</code> automatically gets the
        lock flag.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(links ?? []).map((link) => (
          <form
            key={link.id}
            action={saveNavLink}
            className="flex flex-wrap items-center gap-3 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={link.id} />
            <input
              name="label"
              defaultValue={link.label}
              className="w-32 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <input
              name="href"
              defaultValue={link.href}
              className="flex-1 min-w-[160px] rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={link.sort_order}
              className="w-20 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="visible" defaultChecked={link.visible} />
              Visible
            </label>
            <button
              type="submit"
              className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-ground"
            >
              Save
            </button>
            <button
              formAction={deleteNavLink}
              className="text-sm text-rust"
            >
              Delete
            </button>
          </form>
        ))}
      </div>

      <form
        action={saveNavLink}
        className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-dashed border-line p-3"
      >
        <input
          name="label"
          placeholder="Label"
          required
          className="w-32 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <input
          name="href"
          placeholder="/path"
          required
          className="flex-1 min-w-[160px] rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <input
          name="sort_order"
          type="number"
          defaultValue={nextOrder}
          className="w-20 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="visible" defaultChecked />
          Visible
        </label>
        <button
          type="submit"
          className="rounded-sm border border-teal px-3 py-1.5 text-sm font-semibold text-teal"
        >
          Add link
        </button>
      </form>
    </div>
  );
}
