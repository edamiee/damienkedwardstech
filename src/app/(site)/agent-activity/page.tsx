import Link from "next/link";
import {
  getRecentAgentActivity,
  getAgentSourceStatus,
  getPipelineWorkflowStatus,
} from "@/lib/agent-activity";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { AUDIT_SOURCE_LABELS } from "@/lib/audit-log";
import { getSiteContent } from "@/lib/site-content";

// Explicit bound on how stale this can get, matching the pipeline build
// log entry's own revalidate — this page's "Live" framing shouldn't be
// riding on the fact that getSiteContent()'s cookies() call happens to
// force dynamic rendering as a side effect.
export const revalidate = 60;

export default async function AgentActivityPage() {
  const [entries, sourceStatus, pipelineStatus, content] = await Promise.all([
    getRecentAgentActivity(30),
    getAgentSourceStatus(),
    getPipelineWorkflowStatus(),
    getSiteContent(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        {content.agent_activity_eyebrow}
      </p>
      <h1 className="max-w-[18ch] text-balance font-display text-3xl font-normal leading-tight sm:text-4xl">
        {content.agent_activity_heading}
      </h1>
      <p className="mt-4 max-w-[60ch] text-[15px] text-muted">
        {content.agent_activity_intro}{" "}
        <Link href="/how-it-works" className="text-teal underline">
          See how it works →
        </Link>
      </p>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sourceStatus.map((s) => (
            <div
              key={s.source}
              className="rounded-sm border border-line bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
                  {s.label}
                </p>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    s.lastActive ? "bg-teal-soft" : "bg-line"
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[13px] text-muted">
                {s.lastActive
                  ? `Last active ${formatRelativeTime(s.lastActive)}`
                  : "No activity yet"}
                {" · "}
                {s.totalCount} write{s.totalCount === 1 ? "" : "s"} total
              </p>
            </div>
          ))}

          {pipelineStatus.map((p) => (
            <a
              key={p.name}
              href={p.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm border border-line bg-surface p-4 transition-colors hover:border-teal"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
                  {p.name} ↗
                </p>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    p.active && p.lastSuccess ? "bg-teal-soft" : "bg-rust"
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[13px] text-muted">
                {!p.active
                  ? "Not active — schedule disabled"
                  : p.lastSuccess
                    ? `Last success ${formatRelativeTime(p.lastSuccess)}`
                    : "Never succeeded"}
                {" · github-activity-pipeline"}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Recent writes
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-4 py-3.5"
              >
                <div>
                  <p className="text-sm">{e.summary}</p>
                  <p className="mt-0.5 font-data text-[11px] text-muted">
                    {e.action} · {e.entity_type}
                  </p>
                </div>
                <div className="whitespace-nowrap text-right">
                  <span className="rounded-sm border border-line bg-surface px-2 py-0.5 text-[10.5px] text-muted">
                    {AUDIT_SOURCE_LABELS[e.source] ?? e.source}
                  </span>
                  <p className="mt-1 font-data text-[10.5px] text-muted">
                    {formatRelativeTime(e.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
