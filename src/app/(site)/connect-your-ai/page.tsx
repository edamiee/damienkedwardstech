import Link from "next/link";
import { getMcpClientCount } from "@/lib/mcp-clients";

export const revalidate = 60;

const BASE_URL = "https://damienkedwards.tech";

const DESKTOP_CONFIG = `{
  "mcpServers": {
    "damienkedwardstech": { "type": "http", "url": "${BASE_URL}/api/mcp" }
  }
}`;

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mt-2">
      {label && <p className="mb-1 text-[11.5px] text-muted">{label}</p>}
      <pre className="max-w-full overflow-x-auto rounded-sm border border-line bg-ground p-3 font-data text-[11.5px] leading-relaxed text-fg">
        {children}
      </pre>
    </div>
  );
}

export default async function ConnectYourAiPage() {
  const clientCount = await getMcpClientCount();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rust">
        No account needed
      </p>
      <h1 className="max-w-[22ch] text-balance font-display text-3xl font-normal leading-tight sm:text-4xl">
        Connect your AI to this site
      </h1>
      <p className="mt-4 max-w-[60ch] text-[15px] text-muted">
        This site runs a real MCP (Model Context Protocol) server at{" "}
        <code className="font-data text-[13px] text-fg">/api/mcp</code>. Point Claude, Cursor, or
        any other MCP-speaking client at it and it can search everything published here, check
        build-log stats, and see current availability — no sign-in, no API key.{" "}
        <Link href="/mcp-demo" className="text-teal underline">
          Try it live in your browser first →
        </Link>
      </p>

      <div className="mt-8 rounded-sm border border-line bg-surface p-4">
        <p className="font-data text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal">
          Clients connected
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          <span className="font-display text-xl text-teal">{clientCount.toLocaleString()}</span>{" "}
          AI client{clientCount === 1 ? " has" : "s have"} registered against this server so far.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          What it can do (public tier, no auth)
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { name: "search_content", body: "Semantic search over everything published here." },
            { name: "get_build_log_stats", body: "Measurable outcome stats for a build-log entry." },
            { name: "get_availability", body: "Current availability + contact email." },
          ].map((tool) => (
            <li key={tool.name} className="rounded-sm border border-line bg-surface p-4">
              <p className="font-data text-[12px] text-teal">{tool.name}</p>
              <p className="mt-1 text-[13px] text-muted">{tool.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Claude Code
        </h2>
        <CodeBlock>{`claude mcp add --transport http damienkedwardstech ${BASE_URL}/api/mcp`}</CodeBlock>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Claude Desktop
        </h2>
        <p className="max-w-[60ch] text-[13.5px] text-muted">
          Settings → Connectors → Add custom connector — or edit{" "}
          <code className="font-data text-[12.5px] text-fg">claude_desktop_config.json</code>{" "}
          directly:
        </p>
        <CodeBlock>{DESKTOP_CONFIG}</CodeBlock>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Claude web (claude.ai)
        </h2>
        <p className="max-w-[60ch] text-[13.5px] text-muted">
          Customize → Connectors → Add custom connector → paste{" "}
          <code className="font-data text-[12.5px] text-fg">{BASE_URL}/api/mcp</code> → Add.
          claude.ai discovers this site&apos;s OAuth metadata automatically and registers itself
          — no header or token to copy.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
          Anything else (Cursor, Windsurf, a custom script)
        </h2>
        <p className="max-w-[60ch] text-[13.5px] text-muted">
          Same URL works for any client that speaks MCP over Streamable HTTP. Quick sanity check
          with <code className="font-data text-[12.5px] text-fg">curl</code>:
        </p>
        <CodeBlock>{`curl -s ${BASE_URL}/api/mcp \\
  -H "content-type: application/json" -H "accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</CodeBlock>
      </section>

      <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
        <Link href="/mcp-demo" className="text-teal hover:underline">
          Try the public tools live →
        </Link>
        <Link href="/how-it-works" className="text-teal hover:underline">
          How this site works →
        </Link>
      </div>
    </div>
  );
}
