import Link from "next/link";
import { McpPlayground } from "@/components/mcp-playground";

export default function McpDemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        Live MCP tools
      </p>
      <h1 className="max-w-[24ch] text-balance font-display text-3xl sm:text-4xl">
        Watch this site answer an AI agent
      </h1>
      <p className="mt-5 max-w-[62ch] text-[15.5px] text-muted">
        MCP (Model Context Protocol) is how AI agents call tools instead of just reading pages.
        This site runs one at{" "}
        <code className="font-data text-[13.5px] text-fg">/api/mcp</code> — the same server
        Claude Desktop or any other MCP client would connect to. The three cards below fire real
        requests at that exact endpoint from your browser right now, no client or account
        needed, so you can see the request go out and the response come back.
      </p>

      <div className="mt-10">
        <McpPlayground />
      </div>

      <div className="mt-10 rounded-sm border border-line bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
          Point a real client at it
        </p>
        <p className="mt-2 max-w-[58ch] text-[14.5px] text-muted">
          Everything above is just a browser calling{" "}
          <code className="font-data text-[13px] text-fg">https://damienkedwards.tech/api/mcp</code>{" "}
          with a standard MCP <code className="font-data text-[13px] text-fg">tools/call</code>{" "}
          request — no different from what Claude Desktop sends once you add it as a remote MCP
          server. Same URL, same tools, same responses.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
        <Link href="/how-it-works" className="text-teal hover:underline">
          ← Back to how this site works
        </Link>
        <Link href="/build-log/this-site-as-mcp-tools" className="text-teal hover:underline">
          Read the build log entry →
        </Link>
      </div>
    </div>
  );
}
