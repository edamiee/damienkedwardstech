import "server-only";
import { logAiUsage } from "@/lib/ai-usage";

const MODEL = "voyage-4";

// Thin wrapper around Voyage AI's embeddings API — Anthropic's recommended
// embeddings partner, since Claude has no native embeddings endpoint. Used
// both to index published content (input_type "document") and to embed a
// visitor's question at query time (input_type "query").
export async function embedTexts(
  texts: string[],
  inputType: "document" | "query",
  operation: string
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not configured on the server.");
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
    });
  } catch (err) {
    await logAiUsage({
      provider: "voyage",
      model: MODEL,
      operation,
      status: "error",
      latencyMs: Date.now() - started,
      errorMessage: err instanceof Error ? err.message : "request failed",
    });
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Voyage API error ${res.status}: ${text}`);
    await logAiUsage({
      provider: "voyage",
      model: MODEL,
      operation,
      status: "error",
      latencyMs: Date.now() - started,
      errorMessage: err.message,
    });
    throw err;
  }

  const data = await res.json();
  await logAiUsage({
    provider: "voyage",
    model: MODEL,
    operation,
    status: "ok",
    latencyMs: Date.now() - started,
    totalTokens: data.usage?.total_tokens ?? null,
  });

  const items = (data.data ?? []) as { embedding: number[]; index: number }[];
  return items.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function embedOne(
  text: string,
  inputType: "document" | "query",
  operation: string
): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType, operation);
  return embedding;
}
