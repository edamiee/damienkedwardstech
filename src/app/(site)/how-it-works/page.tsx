import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { apiOperations, type ApiOperation } from "@/lib/openapi-spec";
import { DEEP_DIVES } from "@/lib/deep-dives";
import { parsePairs, type ContentPair } from "@/lib/content-pairs";

function parseList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Derived rather than hand-labeled per route, so it can't drift from the
// spec's actual `security` field. Falls back to scanning the description
// for routes (like the Telegram webhook) that are gated by something other
// than a bearer scheme this spec models — better an approximate flag than
// a confident "Public" on a route that quietly isn't.
function authLabel(op: ApiOperation): string {
  if (op.security?.some((s) => "adminBearer" in s)) return "Admin bearer";
  if (op.security?.some((s) => "cronBearer" in s)) return "Cron bearer";
  if (op.description && /secret|token/i.test(op.description)) return "Restricted — see description";
  return "Public";
}

function ApiReference() {
  return (
    <div className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
        API reference
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">
        Every route this site exposes, read straight from the same OpenAPI spec any tool can
        fetch at{" "}
        <a href="/openapi.json" className="text-teal hover:underline">
          /openapi.json
        </a>
        . Read-only here — the admin-gated routes need a secret only one person has, so
        there&apos;s no &quot;try it&quot; button to send a live request with.
      </p>
      <div className="mt-4 flex flex-col divide-y divide-line rounded-sm border border-line bg-surface">
        {apiOperations.map(({ path, method, op }) => (
          <div
            key={`${method}-${path}`}
            className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <div className="flex shrink-0 items-baseline gap-2 sm:w-[16rem]">
              <span
                className={`rounded-sm px-1.5 py-0.5 font-data text-[10.5px] font-semibold ${
                  method === "GET" ? "bg-teal-soft text-teal" : "bg-rust text-ground"
                }`}
              >
                {method}
              </span>
              <span className="font-data text-[12.5px] text-fg">{path}</span>
            </div>
            <p className="flex-1 text-[13px] text-muted">
              {op.summary}
              <span className="ml-2 whitespace-nowrap font-data text-[10.5px] uppercase tracking-[0.05em] text-rust">
                {authLabel(op)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageArrow() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2">
      <span className="font-data text-lg text-line">↓</span>
    </div>
  );
}

function CardGrid({ items }: { items: ContentPair[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-sm border border-line bg-surface p-4">
          <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
            {item.title}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

// A condensed visual companion to the detailed card sections below it — a
// three-stage summary (counts only, not names) rather than a second copy
// of the lists those cards already show, so it stays short regardless of
// how it wraps. Goes horizontal at sm (640px) rather than lg (1024px) —
// at the old lg threshold, "narrow enough to stack" covered most laptop
// windows with any sidebar open, and the previous 5-item-per-column
// version was tall enough there for the floating chat button to overlap it.
function FlowStage({
  eyebrow,
  eyebrowColor,
  lines,
  emphasized,
}: {
  eyebrow: string;
  eyebrowColor: "rust" | "teal";
  lines: string[];
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border bg-ground px-4 py-4 text-center ${
        emphasized ? "border-2 border-teal" : "border-line"
      }`}
    >
      <p
        className={`font-data text-[10.5px] uppercase tracking-[0.08em] ${
          eyebrowColor === "rust" ? "text-rust" : "text-teal"
        }`}
      >
        {eyebrow}
      </p>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-[13.5px] font-semibold text-fg">
          {line}
        </p>
      ))}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1 text-line sm:px-1 sm:py-0">
      <span className="font-data text-lg sm:hidden">↓</span>
      <span className="hidden font-data text-lg sm:inline">→</span>
    </div>
  );
}

function FlowDiagram({ sourceCount, surfaceCount }: { sourceCount: number; surfaceCount: number }) {
  return (
    <div
      aria-hidden="true"
      className="mt-8 grid grid-cols-1 items-center gap-2 rounded-sm border border-line bg-surface p-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
    >
      <FlowStage eyebrow="Sources" eyebrowColor="rust" lines={[`${sourceCount} paths in`, "people & agents"]} />
      <FlowArrow />
      <FlowStage eyebrow="Core" eyebrowColor="teal" lines={["Postgres", "+ audit log"]} emphasized />
      <FlowArrow />
      <FlowStage eyebrow="Surfaces" eyebrowColor="rust" lines={[`${surfaceCount} ways out`, "visitors & agents"]} />
    </div>
  );
}

export default async function HowItWorksPage() {
  const content = await getSiteContent();
  const sources = parsePairs(content.how_it_works_sources);
  const surfaces = parsePairs(content.how_it_works_surfaces);
  const stack = parseList(content.how_it_works_stack);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        Under the hood
      </p>
      <h1 className="max-w-[22ch] text-balance font-display text-3xl sm:text-4xl">
        How this site works
      </h1>
      <p className="mt-5 max-w-[62ch] text-[15.5px] text-muted">{content.how_it_works_intro}</p>

      <FlowDiagram sourceCount={sources.length} surfaceCount={surfaces.length} />

      <div className="mt-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          1. Five ways content gets in
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted">
          A person or an agent, over Telegram, MCP, or a browser — every path below ends up
          calling the same handful of functions.
        </p>
        <div className="mt-4">
          <CardGrid items={sources} />
        </div>

        <StageArrow />

        <div className="rounded-sm border border-teal bg-surface p-5">
          <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
            One door in, one ledger
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">
            Whichever of the five it came from, every write lands in the same Postgres
            database (Supabase, row-level security on, service-role access only from server
            code) — and every successful write also appends a row to an audit log: who or
            what wrote it, what changed, when. A person and an agent are held to the exact
            same record.
          </p>
        </div>

        <StageArrow />

        <div className="rounded-sm border border-line bg-surface p-5">
          <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
            What becomes searchable
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">
            Every published post, build log entry, and paper — plus a name-and-description-only
            teaser for gated projects, never the link — gets chunked and embedded (Voyage AI)
            into a pgvector index. One click at /admin/chat-index rebuilds it after anything
            changes.
          </p>
        </div>

        <StageArrow />

        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          2. How it gets found again
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted">
          The same index backs every one of these — a visitor and an AI agent asking the same
          question get the same answer.
        </p>
        <div className="mt-4">
          <CardGrid items={surfaces} />
        </div>
      </div>

      <div className="mt-14 rounded-sm border border-line bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">Try it yourself</p>
        <p className="mt-2 max-w-[58ch] text-[14.5px] text-muted">
          The MCP server needs no account — point any MCP client at{" "}
          <code className="font-data text-[13px] text-fg">https://damienkedwards.tech/api/mcp</code>{" "}
          and it can search everything published here. Don&apos;t have an MCP client handy?{" "}
          <Link href="/mcp-demo" className="text-teal hover:underline">
            Run the same three tools from this browser →
          </Link>{" "}
          — real requests, real responses, no install. Or skip the client and just read the
          machine-readable versions of this same page:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          {["/llms.txt", "/openapi.json", "/sitemap.xml", "/build-log/feed.xml"].map((path) => (
            <li key={path}>
              <a
                href={path}
                className="inline-block rounded-sm border border-line px-2.5 py-1 font-data text-teal hover:border-teal"
              >
                {path}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <ApiReference />

      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Built with
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {stack.map((item) => (
            <li key={item} className="rounded-sm border border-line bg-surface px-3 py-1.5">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Read the build log
        </h2>
        <p className="mt-2 max-w-[58ch] text-sm text-muted">
          Each piece above has its own entry with the actual problem, approach, and outcome —
          including the mistakes.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {DEEP_DIVES.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/build-log/${entry.slug}`}
                className="text-[15px] text-fg hover:text-teal"
              >
                {entry.title} →
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {content.how_it_works_related_link_slug && (
        <div className="mt-10 rounded-sm border border-line bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
            A related, separate project
          </p>
          <p className="mt-2 max-w-[58ch] text-[14.5px] text-muted">
            {content.how_it_works_related_body}
          </p>
          <Link
            href={`/build-log/${content.how_it_works_related_link_slug}`}
            className="mt-3 inline-block text-[15px] text-fg hover:text-teal"
          >
            {content.how_it_works_related_link_title} →
          </Link>
        </div>
      )}
    </div>
  );
}
