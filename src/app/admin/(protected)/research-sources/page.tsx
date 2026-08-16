import { createClient } from "@/lib/supabase/server";
import { saveResearchSource, deleteResearchSource } from "./actions";
import { VENDORS, VENDOR_LABELS } from "@/lib/research-findings";
import { formatRelativeTime } from "@/lib/format-relative-time";

const SOURCE_TYPES = ["rss", "github_releases", "changelog_scrape", "forum"] as const;

type Source = {
  id: string;
  vendor: string;
  name: string;
  source_type: string;
  url: string;
  poll_cadence_minutes: number;
  enabled: boolean;
  trust_score: number;
  consecutive_failures: number;
  last_polled_at: string | null;
};

export default async function AdminResearchSourcesPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("research_sources")
    .select(
      "id, vendor, name, source_type, url, poll_cadence_minutes, enabled, trust_score, consecutive_failures, last_polled_at"
    )
    .order("vendor", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl">Research source registry</h1>
      <p className="mt-1 text-sm text-muted">
        Config-driven — adding a row here is enough for the pipeline-research-agent
        pipeline to start polling it on its next run, no deploy needed. See{" "}
        <span className="font-data text-[12px]">docs/research-assistant/design.md §1</span>.
        Fill in real feed/changelog URLs; nothing here polls until the
        ingestion pipeline is deployed.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(sources as Source[] | null ?? []).map((s) => (
          <form
            key={s.id}
            action={saveResearchSource}
            className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={s.id} />
            <select
              name="vendor"
              defaultValue={s.vendor}
              className="rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            >
              {VENDORS.map((v) => (
                <option key={v} value={v}>
                  {VENDOR_LABELS[v]}
                </option>
              ))}
            </select>
            <input
              name="name"
              defaultValue={s.name}
              placeholder="Name"
              className="w-40 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <select
              name="source_type"
              defaultValue={s.source_type}
              className="rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="url"
              defaultValue={s.url}
              className="min-w-[220px] flex-1 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
            />
            <input
              name="poll_cadence_minutes"
              type="number"
              defaultValue={s.poll_cadence_minutes}
              className="w-20 rounded-sm border border-line bg-ground px-2 py-1.5 text-sm"
              title="Poll cadence, minutes"
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={s.enabled} />
              Enabled
            </label>
            <button
              type="submit"
              className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-ground"
            >
              Save
            </button>
            <button formAction={deleteResearchSource} className="text-sm text-rust">
              Delete
            </button>
            <span className="w-full font-data text-[10.5px] text-muted">
              trust {Math.round(s.trust_score * 100)}%
              {s.consecutive_failures > 0 && ` · ${s.consecutive_failures} consecutive failures`}
              {s.last_polled_at
                ? ` · last polled ${formatRelativeTime(s.last_polled_at)}`
                : " · never polled"}
            </span>
          </form>
        ))}
        {(!sources || sources.length === 0) && (
          <p className="text-sm text-muted">No sources registered yet — add one below.</p>
        )}
      </div>

      <form
        action={saveResearchSource}
        className="mt-6 flex flex-wrap items-center gap-2 rounded-sm border border-dashed border-line p-3"
      >
        <select
          name="vendor"
          defaultValue={VENDORS[0]}
          className="rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        >
          {VENDORS.map((v) => (
            <option key={v} value={v}>
              {VENDOR_LABELS[v]}
            </option>
          ))}
        </select>
        <input
          name="name"
          placeholder="Name (e.g. dbt-labs/dbt-core releases)"
          required
          className="w-56 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <select
          name="source_type"
          defaultValue="rss"
          className="rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          name="url"
          placeholder="https://…"
          required
          className="min-w-[220px] flex-1 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <input
          name="poll_cadence_minutes"
          type="number"
          defaultValue={360}
          className="w-20 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="enabled" defaultChecked />
          Enabled
        </label>
        <button
          type="submit"
          className="rounded-sm border border-teal px-3 py-1.5 text-sm font-semibold text-teal"
        >
          Add source
        </button>
      </form>
    </div>
  );
}
