import Link from "next/link";
import { getAiOpsSummary } from "@/lib/ai-usage";
import { getSiteContent } from "@/lib/site-content";

// Matches /agent-activity's own revalidate — this page's "Live" framing
// shouldn't ride on getSiteContent()'s cookies() call forcing dynamic
// rendering as a side effect.
export const revalidate = 60;

const OPERATION_LABELS: Record<string, string> = {
  chat: "Chat widget (generation)",
  chat_embed: "Chat widget (query embed)",
  search_embed: "/search (query embed)",
  reindex: "Content reindex",
  admin_draft_post: "Admin: draft post",
  github_dev_log: "Admin: GitHub dev-log agent",
  telegram_agent: "Telegram admin agent",
  weekly_insight: "Weekly note (cron)",
  synthetic_check: "Synthetic health check (cron)",
};

function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export default async function AiOpsPage() {
  const [summary, content] = await Promise.all([getAiOpsSummary(), getSiteContent()]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        {content.ai_ops_eyebrow}
      </p>
      <h1 className="max-w-[20ch] text-balance font-display text-3xl font-normal leading-tight sm:text-4xl">
        {content.ai_ops_heading}
      </h1>
      <p className="mt-4 max-w-[60ch] text-[15px] text-muted">
        {content.ai_ops_intro}{" "}
        <Link href="/agent-activity" className="text-teal underline">
          See agent activity →
        </Link>
      </p>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          All time
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-sm border border-line bg-surface p-4">
            <p className="font-display text-2xl text-teal">{formatUsd(summary.allTime.costUsd)}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">Estimated cost</p>
          </div>
          <div className="rounded-sm border border-line bg-surface p-4">
            <p className="font-display text-2xl text-teal">{summary.allTime.calls.toLocaleString()}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">API calls logged</p>
          </div>
          {summary.allTime.byProvider.map((p) => (
            <div key={p.provider} className="rounded-sm border border-line bg-surface p-4">
              <p className="font-display text-2xl text-teal">{formatUsd(p.costUsd)}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                <span className="capitalize">{p.provider}</span> · {p.calls.toLocaleString()} calls
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Last 30 days
        </h2>
        <div className="rounded-sm border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
              Reliability
            </p>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                summary.last30d.successRate === null || summary.last30d.successRate >= 0.98
                  ? "bg-teal-soft"
                  : "bg-rust"
              }`}
            />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {summary.last30d.calls === 0
              ? "No calls in the last 30 days"
              : `${(summary.last30d.successRate! * 100).toFixed(1)}% success · avg ${summary.last30d.avgLatencyMs}ms latency · ${summary.last30d.calls.toLocaleString()} calls · ${formatUsd(summary.last30d.costUsd)} spent`}
          </p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Where it goes
        </h2>
        {summary.byOperation.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
            {summary.byOperation.map((op) => (
              <li key={op.operation} className="flex items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm">{OPERATION_LABELS[op.operation] ?? op.operation}</p>
                <p className="shrink-0 whitespace-nowrap font-data text-[11.5px] text-muted">
                  {formatUsd(op.costUsd)} · {op.calls.toLocaleString()} calls
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 max-w-[60ch] text-[12.5px] text-muted">
        Costs are estimated from published list pricing (Anthropic Claude Sonnet 5, Voyage
        voyage-4), not exact billing — they exclude prompt-caching and batch discounts.
      </p>
    </div>
  );
}
