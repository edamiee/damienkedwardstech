// Plain shared constants — deliberately NOT in actions.ts. A "use server"
// file only preserves async-function exports across the client/server
// boundary; a plain array export from that file comes through as undefined
// on the client, crashing finding-review-controls.tsx's .map() call. Same
// reasoning as topics/status.ts.
export const DISCARD_REASONS = [
  "already_covered",
  "too_marketing",
  "too_niche",
  "wrong_category",
  "not_interesting",
] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  already_covered: "Already covered",
  too_marketing: "Too marketing",
  too_niche: "Too niche",
  wrong_category: "Wrong category",
  not_interesting: "Not interesting",
};
