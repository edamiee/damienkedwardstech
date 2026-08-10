// Build log entries that dig into how this site's agent/MCP machinery
// works — referenced from both /how-it-works and /mcp-demo, so it lives
// here once rather than drifting between two copies.
export const DEEP_DIVES = [
  { slug: "site-agent", title: "Site Agent" },
  { slug: "an-agent-toolkit-for-running-the-site", title: "An Agent Toolkit for Running the Site" },
  {
    slug: "retrieval-augmented-chat-ask-this-site-a-question",
    title: "Retrieval-Augmented Chat: Ask This Site a Question",
  },
  { slug: "this-site-as-mcp-tools", title: "This Site as MCP Tools" },
] as const;
