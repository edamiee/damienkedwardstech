// Plain shared constant — deliberately NOT in actions.ts. A "use server"
// file only preserves async-function exports across the client/server
// boundary; a plain array export from that file comes through as
// undefined on the client, crashing status-select.tsx's .map() call.
export const CONTACT_MESSAGE_STATUSES = ["new", "triage", "replied", "archived"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];
