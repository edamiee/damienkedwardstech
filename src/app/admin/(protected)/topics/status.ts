// Plain shared constant — deliberately NOT in actions.ts. A "use server"
// file only preserves async-function exports across the client/server
// boundary; a plain array export from that file comes through as
// undefined on the client, crashing topic-status-select.tsx's .map() call.
export const TOPIC_STATUSES = ["open", "writing", "published", "closed"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];
