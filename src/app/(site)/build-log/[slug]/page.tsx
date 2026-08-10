import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRelatedContent } from "@/lib/related-content";
import { liveFilter } from "@/lib/publish-filter";
import type { Stat } from "@/lib/parse-stats";
import {
  getPipelineActivityMetrics,
  getPipelineCommitCalendar,
  buildCommitCalendarWeeks,
  formatRate,
  formatHours,
} from "@/lib/pipeline-metrics";
import { formatRelativeTime } from "@/lib/format-relative-time";

// The one entry this live-queried section applies to — a distinct build
// log entry gets to reach into a live data source, everything else stays
// plain content. Not worth generalizing into a per-entry config field for
// a single, one-off integration.
const PIPELINE_METRICS_SLUG = "a-dbt-semantic-layer-over-my-own-github-activity";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function heatLevel(count: number, max: number): number {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_CLASSES = [
  "bg-line",
  "bg-teal/25",
  "bg-teal/50",
  "bg-teal/75",
  "bg-teal",
];

export const revalidate = 60;

const SELECT =
  "id, title, summary, problem, approach, outcome, stack, stats, project_url, published_at, published, preview_token";

export default async function BuildLogEntryPage({
  params,
  searchParams,
}: PageProps<"/build-log/[slug]">) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();

  let { data: cs } = await supabase
    .from("case_studies")
    .select(SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .or(liveFilter())
    .maybeSingle();

  let isPreview = false;
  if (!cs && typeof preview === "string" && preview) {
    const { data: draft } = await supabase
      .from("case_studies")
      .select(SELECT)
      .eq("slug", slug)
      .eq("preview_token", preview)
      .maybeSingle();
    if (draft) {
      cs = draft;
      isPreview = true;
    }
  }

  if (!cs) notFound();

  const isPipelineEntry = slug === PIPELINE_METRICS_SLUG;
  const [related, pipelineMetrics, commitCalendarDays] = await Promise.all([
    isPreview ? Promise.resolve([]) : getRelatedContent("build_log", cs.id),
    isPipelineEntry ? getPipelineActivityMetrics() : Promise.resolve(null),
    isPipelineEntry ? getPipelineCommitCalendar() : Promise.resolve([]),
  ]);
  const commitCalendarWeeks = isPipelineEntry
    ? buildCommitCalendarWeeks(commitCalendarDays)
    : [];
  const maxDailyCommits = Math.max(1, ...commitCalendarDays.map((d) => d.count));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: cs.title,
    description: cs.summary ?? undefined,
    datePublished: cs.published_at ?? undefined,
    url: `https://damienkedwards.tech/build-log/${slug}`,
    author: { "@type": "Person", name: "Damien Edwards" },
  };

  const stack: string[] = (cs.stack ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const sections: { label: string; body: string | null }[] = [
    { label: "Problem", body: cs.problem },
    { label: "Approach", body: cs.approach },
    { label: "Outcome", body: cs.outcome },
  ].filter((s) => s.body);

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {isPreview && (
        <p className="mb-4 inline-block rounded-sm border border-rust bg-surface px-3 py-1.5 text-xs font-semibold text-rust">
          Draft preview — not publicly visible yet
        </p>
      )}
      {cs.published_at && (
        <p className="font-data text-[11.5px] text-muted">
          {new Date(cs.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl">{cs.title}</h1>
      {cs.summary && (
        <p className="mt-3 max-w-[60ch] text-[15.5px] text-muted">{cs.summary}</p>
      )}

      {stack.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stack.map((item: string) => (
            <span
              key={item}
              className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {cs.stats && (cs.stats as Stat[]).length > 0 && (
        <div className="mt-8 flex flex-wrap gap-8">
          {(cs.stats as Stat[]).map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl text-teal">{stat.value}</p>
              <p className="mt-1 text-[12.5px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {pipelineMetrics && (
        <div className="mt-8 rounded-sm border border-teal bg-surface p-5">
          <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
            Live from the pipeline
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13px] text-muted">
            Queried from the same Postgres marts this entry describes, on every page load — not a
            snapshot pasted in once.
            {pipelineMetrics.lastIngestedAt &&
              ` Last ingested ${formatRelativeTime(pipelineMetrics.lastIngestedAt)}.`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: "Commits", value: pipelineMetrics.totalCommits.toLocaleString() },
              { label: "Active repos", value: pipelineMetrics.activeRepos.toLocaleString() },
              { label: "Pull requests", value: pipelineMetrics.totalPrs.toLocaleString() },
              {
                label: "PR merge rate",
                value: formatRate(pipelineMetrics.mergedPrs, pipelineMetrics.totalPrs),
              },
              { label: "Issues", value: pipelineMetrics.totalIssues.toLocaleString() },
              {
                label: "Issue close rate",
                value: formatRate(pipelineMetrics.closedIssues, pipelineMetrics.totalIssues),
              },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl text-teal">{stat.value}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">{stat.label}</p>
              </div>
            ))}
            {pipelineMetrics.avgPrCycleTimeHours !== null && (
              <div>
                <p className="font-display text-2xl text-teal">
                  {formatHours(pipelineMetrics.avgPrCycleTimeHours)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">Avg PR cycle time</p>
              </div>
            )}
            {pipelineMetrics.avgIssueCloseHours !== null && (
              <div>
                <p className="font-display text-2xl text-teal">
                  {formatHours(pipelineMetrics.avgIssueCloseHours)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">Avg time to close</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isPipelineEntry && commitCalendarWeeks.length > 0 && (
        <div className="mt-6 rounded-sm border border-line bg-surface p-5">
          <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
            Commit activity, last 12 months
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13px] text-muted">
            Queried from marts.fct_commits, grouped by day — the same table
            the stats above come from.
          </p>
          <div className="mt-4 overflow-x-auto">
            <div className="inline-flex gap-[3px] pb-1">
              {commitCalendarWeeks.map((week, weekIndex) => {
                const firstDay = week.find((d) => d.date)?.date;
                const prevFirstDay = commitCalendarWeeks[weekIndex - 1]?.find(
                  (d) => d.date
                )?.date;
                const showMonthLabel =
                  firstDay &&
                  (!prevFirstDay ||
                    new Date(firstDay).getUTCMonth() !==
                      new Date(prevFirstDay).getUTCMonth());

                return (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    <div className="h-[13px] font-data text-[9.5px] text-muted">
                      {showMonthLabel && firstDay
                        ? MONTH_LABELS[new Date(firstDay).getUTCMonth()]
                        : ""}
                    </div>
                    {week.map((day, dayIndex) => (
                      <div
                        key={day.date ?? `pad-${weekIndex}-${dayIndex}`}
                        title={
                          day.date
                            ? `${day.count} commit${day.count === 1 ? "" : "s"} on ${day.date}`
                            : undefined
                        }
                        className={`h-[11px] w-[11px] rounded-[2px] ${
                          day.date
                            ? LEVEL_CLASSES[heatLevel(day.count, maxDailyCommits)]
                            : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <span>Less</span>
            {LEVEL_CLASSES.map((cls) => (
              <span key={cls} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {cs.project_url && (
        <a
          href={cs.project_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-sm bg-teal px-5 py-2.5 text-sm font-semibold text-ground"
        >
          View project ↗
        </a>
      )}

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.label} className="border-l-2 border-teal pl-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
              {section.label}
            </h2>
            <p className="mt-2 max-w-[60ch] whitespace-pre-line text-[15.5px] leading-relaxed text-fg">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <div className="mt-14 border-t border-line pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            Related
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {related.map((r) => (
              <li key={r.url_path + r.title}>
                <Link href={r.url_path} className="text-[15px] hover:text-teal">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
