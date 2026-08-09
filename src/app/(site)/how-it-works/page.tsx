import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { apiOperations, type ApiOperation } from "@/lib/openapi-spec";

type TitleDetail = { title: string; detail: string };

// how_it_works_sources / how_it_works_surfaces are stored as one
// "Title | detail" pair per line in site_content — editable at
// /admin/content without needing a bespoke structured-content editor.
function parsePairs(raw: string): TitleDetail[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split("|");
      return { title: title.trim(), detail: rest.join("|").trim() };
    });
}

function parseList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const DEEP_DIVES = [
  { slug: "site-agent", title: "Site Agent" },
  { slug: "an-agent-toolkit-for-running-the-site", title: "An Agent Toolkit for Running the Site" },
  {
    slug: "retrieval-augmented-chat-ask-this-site-a-question",
    title: "Retrieval-Augmented Chat: Ask This Site a Question",
  },
  { slug: "this-site-as-mcp-tools", title: "This Site as MCP Tools" },
];

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

function CardGrid({ items }: { items: TitleDetail[] }) {
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

// A condensed visual companion to the detailed card sections below it —
// names only, no descriptions, so it reads at a glance. Flex-col by
// default, flipping to a horizontal row at lg — each column's own content
// is a single child (not mixed text + elements) so it can't hit the
// anonymous-flex-item wrapping bug the homepage's status pills had.
function FlowDiagram({ sourceNames, surfaceNames }: { sourceNames: string[]; surfaceNames: string[] }) {
  return (
    <div
      aria-hidden="true"
      className="mt-8 flex flex-col items-stretch gap-3 rounded-sm border border-line bg-surface p-5 lg:flex-row lg:items-center lg:gap-0"
    >
      <div className="flex-1">
        <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">Sources</p>
        <ul className="mt-2 flex flex-col gap-1 text-[13px] text-fg">
          {sourceNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center px-2 py-1 text-line lg:py-0">
        <span className="font-data text-base lg:hidden">↓</span>
        <span className="hidden font-data text-base lg:inline">→</span>
      </div>

      <div className="rounded-sm border border-teal bg-ground px-4 py-3 text-center lg:w-[15ch]">
        <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-teal">Core</p>
        <p className="mt-1 text-[13px] font-semibold text-fg">Postgres</p>
        <p className="text-[13px] font-semibold text-fg">+ audit log</p>
      </div>

      <div className="flex items-center justify-center px-2 py-1 text-line lg:py-0">
        <span className="font-data text-base lg:hidden">↓</span>
        <span className="hidden font-data text-base lg:inline">→</span>
      </div>

      <div className="flex-1">
        <p className="font-data text-[10.5px] uppercase tracking-[0.08em] text-rust">Surfaces</p>
        <ul className="mt-2 flex flex-col gap-1 text-[13px] text-fg">
          {surfaceNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
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

      <FlowDiagram
        sourceNames={sources.map((s) => s.title)}
        surfaceNames={surfaces.map((s) => s.title)}
      />

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
          and it can search everything published here. Or skip the client and just read the
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
    </div>
  );
}
