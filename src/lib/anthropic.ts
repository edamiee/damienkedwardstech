import "server-only";

// Thin wrapper around the Messages API. Server-only: ANTHROPIC_API_KEY never
// reaches the browser. Reuses the same key/model convention as the arcade
// app's AI question generator.
export async function callClaude(
  system: string,
  userPrompt: string,
  maxTokens: number
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find(
    (b: { type: string; text?: string }) => b.type === "text" && b.text
  );
  const text = textBlock?.text as string | undefined;
  if (!text) {
    const reason = data.stop_reason ? ` (stop_reason: ${data.stop_reason})` : "";
    throw new Error(`Empty response from Anthropic${reason}.`);
  }
  return text;
}

type AnthropicBlock = { type: string; [key: string]: unknown };

async function anthropicRequest(body: Record<string, unknown>): Promise<{
  content: AnthropicBlock[];
  stop_reason: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-5", ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Anthropic's web_search server tool: the API runs searches itself
// (possibly several per request) and returns a final response with
// citations — no client-side tool_use/tool_result loop needed for this one.
export async function callClaudeWithWebSearch(
  system: string,
  userPrompt: string,
  maxTokens: number,
  maxSearches = 5
): Promise<{ text: string; sources: { url: string; title: string }[] }> {
  const data = await anthropicRequest({
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
  });

  const text = data.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");

  if (!text) {
    throw new Error(`Empty response from Anthropic (stop_reason: ${data.stop_reason}).`);
  }

  const seen = new Set<string>();
  const sources: { url: string; title: string }[] = [];
  for (const block of data.content) {
    if (block.type !== "text" || !Array.isArray(block.citations)) continue;
    for (const citation of block.citations as Record<string, unknown>[]) {
      const url = citation.url as string | undefined;
      if (citation.type === "web_search_result_location" && url && !seen.has(url)) {
        seen.add(url);
        sources.push({ url, title: (citation.title as string) ?? url });
      }
    }
  }

  return { text, sources };
}

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

// Generic client-tool loop: Claude requests a tool call, we run it locally
// (against our own DB/APIs) and feed the result back, repeating until it
// gives a final text answer or maxTurns is hit — the cap exists so a
// confused model can't loop indefinitely burning API calls.
export async function runClaudeToolLoop({
  system,
  userPrompt,
  tools,
  executeTool,
  maxTokens,
  maxTurns = 4,
  history = [],
}: {
  system: string;
  userPrompt: string;
  tools: ToolDefinition[];
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  maxTokens: number;
  maxTurns?: number;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const messages: { role: "user" | "assistant"; content: unknown }[] = [
    ...history,
    { role: "user", content: userPrompt },
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const data = await anthropicRequest({
      max_tokens: maxTokens,
      system,
      messages,
      tools,
    });

    messages.push({ role: "assistant", content: data.content });

    if (data.stop_reason !== "tool_use") {
      const text = data.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("");
      if (!text) {
        throw new Error(`Empty response from Anthropic (stop_reason: ${data.stop_reason}).`);
      }
      return text;
    }

    const toolUses = data.content.filter((b) => b.type === "tool_use");
    const toolResults = await Promise.all(
      toolUses.map(async (block) => {
        let content: string;
        try {
          content = await executeTool(
            block.name as string,
            (block.input as Record<string, unknown>) ?? {}
          );
        } catch (err) {
          content = `Error: ${err instanceof Error ? err.message : "tool failed"}`;
        }
        return { type: "tool_result", tool_use_id: block.id, content };
      })
    );
    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Tool loop exceeded max turns without a final answer.");
}
