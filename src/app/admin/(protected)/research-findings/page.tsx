import {
  getPendingFindings,
  getRecentlyReviewedFindings,
  VENDOR_LABELS,
  PATTERN_CATEGORY_LABELS,
  DISCARD_REASON_LABELS,
} from "@/lib/research-findings";
import { formatRelativeTime } from "@/lib/format-relative-time";
import FindingReviewControls from "./finding-review-controls";

export default async function AdminResearchFindingsPage() {
  const [pending, reviewed] = await Promise.all([
    getPendingFindings(),
    getRecentlyReviewedFindings(20),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">Research findings</h1>
      <p className="mt-1 text-sm text-muted">
        Classified and summarized by the pipeline-research-agent pipeline.
        Approve to publish immediately at{" "}
        <a href="/research" target="_blank" rel="noreferrer" className="text-teal hover:underline">
          /research ↗
        </a>{" "}
        — no separate draft step, since the content is already the LLM&apos;s
        structured output, not something you edit here. Discard with a reason
        so the feedback loop has something to learn from.
      </p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
        Awaiting review ({pending.length})
      </h2>
      <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
        {pending.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-data text-[10px] uppercase tracking-[0.06em] text-rust">
                  {VENDOR_LABELS[f.vendor]}
                </span>
                <span className="font-data text-[10px] uppercase tracking-[0.06em] text-muted">
                  {PATTERN_CATEGORY_LABELS[f.pattern_category]}
                </span>
                {f.confidence !== null && (
                  <span className="font-data text-[10px] text-muted">
                    {Math.round(f.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">{f.title}</p>
              <p className="mt-1 max-w-[55ch] text-[12.5px] text-muted">{f.why_it_matters}</p>
              <p className="mt-1 font-data text-[10.5px] text-muted">
                {formatRelativeTime(f.found_at)}
                {f.source_urls.length > 0 && (
                  <>
                    {" · "}
                    <a
                      href={f.source_urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal hover:underline"
                    >
                      source ↗
                    </a>
                  </>
                )}
              </p>
            </div>
            <FindingReviewControls id={f.id} />
          </li>
        ))}
        {pending.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">
            Nothing waiting — the pipeline hasn&apos;t surfaced anything new,
            or you&apos;re fully caught up.
          </li>
        )}
      </ul>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
        Recently reviewed
      </h2>
      <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
        {reviewed.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm">{f.title}</p>
              <p className="mt-1 font-data text-[10.5px] text-muted">
                {VENDOR_LABELS[f.vendor]} ·{" "}
                {f.reviewed_at ? formatRelativeTime(f.reviewed_at) : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-sm border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.06em] ${
                f.status === "approved"
                  ? "border-teal text-teal"
                  : "border-rust text-rust"
              }`}
            >
              {f.status === "approved" ? "Approved" : DISCARD_REASON_LABELS[f.discarded_reason ?? "not_interesting"]}
            </span>
          </li>
        ))}
        {reviewed.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Nothing reviewed yet.</li>
        )}
      </ul>
    </div>
  );
}
