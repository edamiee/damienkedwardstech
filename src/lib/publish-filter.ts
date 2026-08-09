// Combined with .eq("published", true), gates rows whose publish_at is
// either unset or already in the past — the mechanism behind scheduled
// publishing. Real-time on every request, so no cron is needed to "flip"
// anything live; the row just starts matching once its time arrives.
export function liveFilter(): string {
  return `publish_at.is.null,publish_at.lte.${new Date().toISOString()}`;
}
