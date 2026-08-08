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
