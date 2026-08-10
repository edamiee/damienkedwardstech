import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AUDIT_SOURCE_LABELS } from "@/lib/audit-log";

const SOURCES = Object.entries(AUDIT_SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default async function AdminAuditLogPage({
  searchParams,
}: PageProps<"/admin/audit-log">) {
  const { source } = await searchParams;
  const activeSource = typeof source === "string" ? source : null;

  const supabase = await createClient();
  let query = supabase
    .from("content_audit_log")
    .select("id, source, action, entity_type, entity_id, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(150);

  if (activeSource) query = query.eq("source", activeSource);

  const { data: entries } = await query;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Audit log</h1>
      <p className="mt-1 text-sm text-muted">
        Every content change across all five write paths — this admin panel,
        the external Site Agent, the research and dev-log agents, and the
        Telegram admin agent. Most recent 150 shown.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/audit-log"
          className={`rounded-sm border px-2.5 py-1 text-[11.5px] ${
            !activeSource
              ? "border-teal bg-teal text-ground"
              : "border-line bg-surface text-muted hover:text-teal"
          }`}
        >
          All
        </Link>
        {SOURCES.map((s) => (
          <Link
            key={s.value}
            href={`/admin/audit-log?source=${s.value}`}
            className={`rounded-sm border px-2.5 py-1 text-[11.5px] ${
              activeSource === s.value
                ? "border-teal bg-teal text-ground"
                : "border-line bg-surface text-muted hover:text-teal"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <ul className="mt-6 divide-y divide-line">
        {(entries ?? []).map((entry) => (
          <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm">{entry.summary}</p>
              <p className="mt-0.5 font-data text-[11px] text-muted">
                {entry.action} · {entry.entity_type}
                {entry.entity_id ? ` · ${entry.entity_id}` : ""}
              </p>
            </div>
            <div className="whitespace-nowrap text-right">
              <span className="rounded-sm bg-surface px-2 py-0.5 text-[10.5px] text-muted">
                {SOURCES.find((s) => s.value === entry.source)?.label ?? entry.source}
              </span>
              <p className="mt-1 font-data text-[10.5px] text-muted">
                {new Date(entry.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        ))}
        {(!entries || entries.length === 0) && (
          <li className="py-4 text-sm text-muted">
            {activeSource ? "Nothing logged from this source yet." : "Nothing logged yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
