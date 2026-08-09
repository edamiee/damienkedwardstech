import { createClient } from "@/lib/supabase/server";
import { saveGithubLink, deleteGithubLink, draftDevLogWithAgent } from "./actions";

export default async function AdminGithubLinksPage({
  searchParams,
}: PageProps<"/admin/github-links">) {
  const { agent_error: agentError } = await searchParams;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("github_links")
    .select("id, label, url, sort_order, visible")
    .order("sort_order", { ascending: true });

  const nextOrder = (links?.length ?? 0) * 10;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">GitHub repositories</h1>
      <p className="mt-1 text-sm text-muted">
        Shown on the gated projects page, in order. Add one per repo — the
        project write-up they belong to, or just a repo worth pointing
        signed-in visitors at.
      </p>

      <form
        action={draftDevLogWithAgent}
        className="mt-6 flex flex-col gap-2 rounded-sm border border-dashed border-line p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            Have the agent draft a &quot;what I shipped this week&quot; post from
            recent commits across these repos
          </p>
          <button
            type="submit"
            className="whitespace-nowrap rounded-sm border border-teal px-3 py-1.5 text-sm font-semibold text-teal"
          >
            Draft dev log
          </button>
        </div>
        <p className="text-xs text-muted">
          Saved as an unpublished draft for review — skips entirely if
          there&apos;s no commit activity in the last 7 days.
        </p>
        {typeof agentError === "string" && (
          <p className="text-xs text-rust">{agentError}</p>
        )}
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {(links ?? []).map((link) => (
          <form
            key={link.id}
            action={saveGithubLink}
            className="flex flex-wrap items-center gap-3 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={link.id} />
            <input
              name="label"
              defaultValue={link.label}
              className="w-32 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <input
              name="url"
              defaultValue={link.url}
              className="flex-1 min-w-[200px] rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
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
            <button formAction={deleteGithubLink} className="text-sm text-rust">
              Delete
            </button>
          </form>
        ))}
        {(!links || links.length === 0) && (
          <p className="text-sm text-muted">No repositories linked yet.</p>
        )}
      </div>

      <form
        action={saveGithubLink}
        className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-dashed border-line p-3"
      >
        <input
          name="label"
          placeholder="Label (e.g. arcade-app)"
          required
          className="w-32 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <input
          name="url"
          placeholder="https://github.com/…"
          required
          className="flex-1 min-w-[200px] rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
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
          Add repository
        </button>
      </form>
    </div>
  );
}
