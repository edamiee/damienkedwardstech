// Splits long text into paragraph-aligned chunks under maxLen, so each
// embedding covers a coherent slice of content instead of an arbitrary
// character cutoff.
export function chunkText(text: string, maxLen = 1200): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks.length ? chunks : [text.slice(0, maxLen)];
}
