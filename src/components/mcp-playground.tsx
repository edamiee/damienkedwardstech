"use client";

import { useId, useState } from "react";
import { DEEP_DIVES } from "@/lib/deep-dives";

type CallResult = {
  text: string;
  isError: boolean;
  request: unknown;
  response: unknown;
};

type CallState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: CallResult }
  | { status: "error"; message: string };

// Talks to /api/mcp exactly like any other MCP client would: one stateless
// JSON-RPC `tools/call` POST, no session handshake needed (see the comment
// atop src/app/api/mcp/route.ts). The response arrives as a single SSE
// event for a one-shot call like this, so we just grab the one `data:` line.
async function callMcpTool(name: string, args: Record<string, unknown>): Promise<CallResult> {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name, arguments: args },
  };

  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(request),
  });

  const raw = await res.text();
  const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
  if (!dataLine) throw new Error("Unexpected response from the MCP endpoint.");

  const response = JSON.parse(dataLine.slice("data: ".length));
  if (response.error) throw new Error(response.error.message ?? "The MCP server returned an error.");

  const content = (response.result?.content ?? []) as { type: string; text?: string }[];
  const text = content
    .map((c) => c.text)
    .filter((t): t is string => Boolean(t))
    .join("\n");

  return { text, isError: Boolean(response.result?.isError), request, response };
}

function RawExchange({ request, response }: { request: unknown; response: unknown }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[11.5px] text-muted hover:text-teal">
        Raw MCP request / response
      </summary>
      <pre className="mt-2 max-w-full overflow-x-auto rounded-sm border border-line bg-ground p-3 font-data text-[11px] leading-relaxed text-muted">
        {JSON.stringify(request, null, 2)}
        {"\n\n"}
        {JSON.stringify(response, null, 2)}
      </pre>
    </details>
  );
}

// Renders the plain-text content block a text-only MCP tool returns.
// search_content's output happens to follow a "[kind] Title — url\nsnippet"
// convention (see src/app/api/mcp/route.ts) so we dress that one up with
// clickable links; everything else just prints as-is.
function ResultBody({ toolName, result }: { toolName: string; result: CallResult }) {
  if (result.isError) {
    return <p className="text-[13.5px] text-rust">{result.text}</p>;
  }

  if (toolName === "search_content") {
    const entries = result.text.split("\n\n").filter(Boolean);
    return (
      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => {
          const [head, ...rest] = entry.split("\n");
          const match = head.match(/^\[(.+?)\] (.+?) — (https?:\S+)$/);
          if (!match) return <p key={i} className="text-[13.5px] text-fg">{entry}</p>;
          const [, kind, title, url] = match;
          return (
            <div key={i}>
              <span className="font-data text-[10px] uppercase tracking-[0.06em] text-rust">
                {kind}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[13.5px] font-semibold text-fg hover:text-teal"
              >
                {title} ↗
              </a>
              <p className="mt-0.5 text-[13px] text-muted">{rest.join(" ")}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-[13.5px] text-fg">{result.text}</p>;
}

function ToolCard({
  toolName,
  title,
  description,
  run,
  controls,
}: {
  toolName: string;
  title: string;
  description: string;
  run: () => Promise<CallResult>;
  controls?: React.ReactNode;
}) {
  const [state, setState] = useState<CallState>({ status: "idle" });

  async function handleRun() {
    setState({ status: "loading" });
    try {
      const result = await run();
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  }

  return (
    <div className="rounded-sm border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-display text-base">{title}</p>
        <code className="font-data text-[11px] text-rust">{toolName}</code>
      </div>
      <p className="mt-1.5 max-w-[55ch] text-[13px] text-muted">{description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {controls}
        <button
          onClick={handleRun}
          disabled={state.status === "loading"}
          className="rounded-sm bg-teal px-3.5 py-1.5 text-[13px] font-semibold text-ground disabled:opacity-60"
        >
          {state.status === "loading" ? "Calling…" : "Run this tool"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="mt-3 text-[13.5px] text-rust">{state.message}</p>
      )}

      {state.status === "done" && (
        <div className="mt-4 border-t border-line pt-4">
          <ResultBody toolName={toolName} result={state.result} />
          <RawExchange request={state.result.request} response={state.result.response} />
        </div>
      )}
    </div>
  );
}

function SearchCard() {
  const [query, setQuery] = useState("agent tools");
  const inputId = useId();

  return (
    <ToolCard
      toolName="search_content"
      title="Search site content"
      description="Semantic search over every post, paper, and build log entry published here."
      run={() => callMcpTool("search_content", { query })}
      controls={
        <input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. RAG pipelines"
          className="min-w-0 flex-1 rounded-sm border border-line bg-ground px-3 py-1.5 text-[13px] text-fg placeholder:text-muted focus:border-teal focus:outline-none"
        />
      }
    />
  );
}

function AvailabilityCard() {
  return (
    <ToolCard
      toolName="get_availability"
      title="Check availability"
      description="Damien's current availability status and preferred contact info, read live off the same content the admin panel edits."
      run={() => callMcpTool("get_availability", {})}
    />
  );
}

function BuildLogStatsCard() {
  const [slug, setSlug] = useState<string>(DEEP_DIVES[0].slug);
  const selectId = useId();

  return (
    <ToolCard
      toolName="get_build_log_stats"
      title="Get build log stats"
      description="The measurable outcome stats recorded for one build log entry, by slug."
      run={() => callMcpTool("get_build_log_stats", { slug })}
      controls={
        <select
          id={selectId}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="min-w-0 flex-1 rounded-sm border border-line bg-ground px-3 py-1.5 text-[13px] text-fg focus:border-teal focus:outline-none"
        >
          {DEEP_DIVES.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.title}
            </option>
          ))}
        </select>
      }
    />
  );
}

export type McpTool = "search_content" | "get_availability" | "get_build_log_stats";

const CARDS: Record<McpTool, () => React.JSX.Element> = {
  search_content: SearchCard,
  get_availability: AvailabilityCard,
  get_build_log_stats: BuildLogStatsCard,
};

export function McpPlayground({ enabledTools }: { enabledTools: McpTool[] }) {
  return (
    <div className="flex flex-col gap-4">
      {enabledTools.map((tool) => {
        const Card = CARDS[tool];
        return <Card key={tool} />;
      })}
    </div>
  );
}
