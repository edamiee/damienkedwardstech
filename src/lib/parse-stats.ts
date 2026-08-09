export type Stat = { value: string; label: string };

// Admin enters one stat per line as "VALUE | LABEL" (e.g. "40% | faster
// ingestion") rather than a dynamic array editor — matches the site's
// other comma/line-delimited admin fields (tags, stack).
export function parseStats(input: string): Stat[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split("|");
      return { value: value.trim(), label: rest.join("|").trim() };
    })
    .filter((s) => s.value && s.label);
}

export function formatStats(stats: Stat[] | null | undefined): string {
  return (stats ?? []).map((s) => `${s.value} | ${s.label}`).join("\n");
}
