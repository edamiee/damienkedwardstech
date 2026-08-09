-- Optional structured fields for the contact form, used only when
-- business_inquiry_enabled is on (see src/lib/site-content.ts defaults).
-- Nullable — regular contact messages never set these.
alter table public.contact_messages add column if not exists project_type text;
alter table public.contact_messages add column if not exists budget_range text;
alter table public.contact_messages add column if not exists timeline text;
