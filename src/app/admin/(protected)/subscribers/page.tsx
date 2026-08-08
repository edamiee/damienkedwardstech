import { createClient } from "@/lib/supabase/server";

export default async function AdminSubscribersPage() {
  const supabase = await createClient();
  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("email, source, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl">Subscribers</h1>
        <a href="/admin/subscribers/export" className="text-sm text-teal hover:underline">
          Export CSV ↓
        </a>
      </div>
      <p className="mt-1 text-sm text-muted">
        Captured from the homepage&apos;s weekly note signup. Storage only —
        nothing is sent automatically yet. Export and send through whatever
        tool you&apos;re using.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {(subscribers ?? []).map((s) => (
          <li key={s.email} className="flex items-center justify-between gap-4 py-3">
            <span className="font-data text-sm">{s.email}</span>
            <span className="whitespace-nowrap font-data text-[11.5px] text-muted">
              {new Date(s.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </li>
        ))}
        {(!subscribers || subscribers.length === 0) && (
          <li className="py-4 text-sm text-muted">No subscribers yet.</li>
        )}
      </ul>
      <p className="mt-4 text-xs text-muted">{subscribers?.length ?? 0} total</p>
    </div>
  );
}
