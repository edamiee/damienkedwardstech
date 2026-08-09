import Link from "next/link";

const SOURCES = [
  {
    title: "Site Agent",
    detail:
      "A Telegram bot (@dames81_bot) with full write access — posts, build log entries, site copy — over a plain HTTP endpoint.",
  },
  {
    title: "Admin Agent",
    detail:
      "A second, separate Telegram bot behind a webhook. Narrower tool set, and only replies to one allowlisted chat — anyone else is silently ignored.",
  },
  {
    title: "MCP clients",
    detail:
      "Claude Desktop, Claude Code, or any other MCP-speaking tool, connected straight to this site's own MCP server.",
  },
  {
    title: "Scheduled agents",
    detail:
      "A research-and-draft agent, a GitHub activity digest, a content-health checker, and a weekly note generator — each a bounded Claude tool loop.",
  },
  {
    title: "Admin UI",
    detail:
      "Damien, signed in at /admin — the fallback for anything the agents above don't do, like image uploads or deleting things.",
  },
];

const SURFACES = [
  {
    title: "Public pages",
    detail: "Server-rendered straight from Postgres — no build-time regeneration needed to go live.",
  },
  {
    title: "Chat widget",
    detail:
      "pgvector search feeds Claude only what's actually published; answers are grounded and cited, never hallucinated.",
  },
  {
    title: "/search",
    detail: "The same semantic search as the chat widget, as a plain results page.",
  },
  {
    title: "MCP server",
    detail:
      "The same search, plus availability and build-log stats, exposed as tools any MCP client can call — no auth needed for the public tier.",
  },
  {
    title: "Feeds",
    detail: "/llms.txt, /sitemap.xml, two RSS feeds, and /openapi.json — for the visitors that don't run JS.",
  },
];

const STACK = [
  "Next.js 16 (App Router, Vercel)",
  "Supabase — Postgres + pgvector",
  "Anthropic Claude — agents, chat, weekly note",
  "Voyage AI — embeddings",
  "Telegram Bot API",
  "GitHub REST API",
  "Resend — transactional email",
];

const DEEP_DIVES = [
  { slug: "site-agent", title: "Site Agent" },
  { slug: "an-agent-toolkit-for-running-the-site", title: "An Agent Toolkit for Running the Site" },
  {
    slug: "retrieval-augmented-chat-ask-this-site-a-question",
    title: "Retrieval-Augmented Chat: Ask This Site a Question",
  },
  { slug: "this-site-as-mcp-tools", title: "This Site as MCP Tools" },
];

function StageArrow() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2">
      <span className="font-data text-lg text-line">↓</span>
    </div>
  );
}

function CardGrid({ items }: { items: { title: string; detail: string }[] }) {
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

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        Under the hood
      </p>
      <h1 className="max-w-[22ch] text-balance font-display text-3xl sm:text-4xl">
        How this site works
      </h1>
      <p className="mt-5 max-w-[62ch] text-[15.5px] text-muted">
        Most of the words on this site were typed by a person. A growing share of them
        weren&apos;t — a handful of Claude-powered agents write and publish here directly,
        through the same front door as everything else. This page is the map: where content
        comes from, what happens to it on the way in, and how it gets found again.
      </p>

      <div className="mt-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          1. Five ways content gets in
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted">
          A person or an agent, over Telegram, MCP, or a browser — every path below ends up
          calling the same handful of functions.
        </p>
        <div className="mt-4">
          <CardGrid items={SOURCES} />
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
          <CardGrid items={SURFACES} />
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

      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Built with
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {STACK.map((item) => (
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
