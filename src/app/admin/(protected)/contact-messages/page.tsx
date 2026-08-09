import { createClient } from "@/lib/supabase/server";

export default async function AdminContactMessagesPage() {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("id, name, email, message, created_at, source, project_type, budget_range, timeline")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Messages</h1>
      <p className="mt-1 text-sm text-muted">
        Sent from the contact form. Reply directly to the sender&apos;s email.
      </p>

      <ul className="mt-6 divide-y divide-line">
        {(messages ?? []).map((m) => (
          <li key={m.id} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a href={`mailto:${m.email}`} className="font-medium text-teal hover:underline">
                {m.name} — {m.email}
              </a>
              <span className="whitespace-nowrap font-data text-[11.5px] text-muted">
                {new Date(m.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {m.source === "business_inquiry" && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm bg-surface px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.06em] text-teal">
                  Business inquiry
                </span>
                {[m.project_type, m.budget_range, m.timeline].filter(Boolean).map((detail) => (
                  <span
                    key={detail}
                    className="rounded-sm bg-surface px-1.5 py-0.5 font-data text-[10px] text-muted"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 whitespace-pre-line text-sm text-fg">{m.message}</p>
          </li>
        ))}
        {(!messages || messages.length === 0) && (
          <li className="py-4 text-sm text-muted">No messages yet.</li>
        )}
      </ul>
    </div>
  );
}
