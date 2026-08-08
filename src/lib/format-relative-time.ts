// Small "2 hours ago" formatter — avoids pulling in a date library for the
// one spot on the site that needs relative time (the Hermes activity line).
export function formatRelativeTime(date: string | Date): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.max(0, (Date.now() - then.getTime()) / 1000);

  const units: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [label, secondsInUnit] of units) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return `${value} ${label}${value > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
