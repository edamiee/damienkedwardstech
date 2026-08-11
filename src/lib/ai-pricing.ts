// List pricing, not exact billing (excludes prompt-caching/batch discounts).
// Checked 2026-08-10 against anthropic.com/claude/sonnet and
// docs.voyageai.com/docs/pricing. Anthropic's Sonnet 5 introductory pricing
// runs through 2026-08-31 — update the anthropic entry after that date.
export const PRICING = {
  anthropic: {
    "claude-sonnet-5": { inputPerM: 2, outputPerM: 10 },
  },
  voyage: {
    "voyage-4": { perM: 0.06 },
  },
} as const;

export function estimateCost(
  provider: "anthropic" | "voyage",
  model: string,
  usage: { inputTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null }
): number | null {
  if (provider === "anthropic") {
    const rates = (PRICING.anthropic as Record<string, { inputPerM: number; outputPerM: number }>)[model];
    if (!rates || usage.inputTokens == null || usage.outputTokens == null) return null;
    return (usage.inputTokens / 1_000_000) * rates.inputPerM + (usage.outputTokens / 1_000_000) * rates.outputPerM;
  }

  const rates = (PRICING.voyage as Record<string, { perM: number }>)[model];
  if (!rates || usage.totalTokens == null) return null;
  return (usage.totalTokens / 1_000_000) * rates.perM;
}
