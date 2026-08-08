import "server-only";

// Thin wrapper around Voyage AI's embeddings API — Anthropic's recommended
// embeddings partner, since Claude has no native embeddings endpoint. Used
// both to index published content (input_type "document") and to embed a
// visitor's question at query time (input_type "query").
export async function embedTexts(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not configured on the server.");
  }

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model: "voyage-4", input_type: inputType }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const items = (data.data ?? []) as { embedding: number[]; index: number }[];
  return items.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function embedOne(text: string, inputType: "document" | "query"): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType);
  return embedding;
}
