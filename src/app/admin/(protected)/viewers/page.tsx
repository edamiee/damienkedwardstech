import { createClient } from "@/lib/supabase/server";
import { addViewer, removeViewer } from "./actions";

export default async function AdminViewersPage() {
  const supabase = await createClient();
  const { data: viewers } = await supabase
    .from("project_viewer_invites")
    .select("email, note, invited_at")
    .order("invited_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Project viewer invites</h1>
      <p className="mt-1 text-sm text-muted">
        Anyone listed here can sign in at /projects/login with a magic link
        to see the gated Projects area. You don&apos;t need to add yourself
        — your admin account already has access.
      </p>

      <form action={addViewer} className="mt-6 flex flex-wrap gap-3 rounded-sm border border-line bg-surface p-4">
        <input
          name="email"
          type="email"
          placeholder="email@example.com"
          required
          className="flex-1 rounded-sm border border-line bg-ground px-3 py-2 text-sm"
        />
        <input
          name="note"
          placeholder="Note (optional)"
          className="flex-1 rounded-sm border border-line bg-ground px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-ground"
        >
          Invite
        </button>
      </form>

      <ul className="mt-6 divide-y divide-line">
        {(viewers ?? []).map((v) => (
          <li key={v.email} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-data text-sm">{v.email}</p>
              {v.note && <p className="mt-0.5 text-xs text-muted">{v.note}</p>}
            </div>
            <form action={removeViewer}>
              <input type="hidden" name="email" value={v.email} />
              <button className="text-sm text-rust">Remove</button>
            </form>
          </li>
        ))}
        {(!viewers || viewers.length === 0) && (
          <li className="py-4 text-sm text-muted">No one invited yet.</li>
        )}
      </ul>
    </div>
  );
}
