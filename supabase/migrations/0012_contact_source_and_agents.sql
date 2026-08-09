-- Distinguishes contact_messages that came from the chat widget's
-- notify_damien tool from ones submitted through the contact form itself.
alter table public.contact_messages add column if not exists source text not null default 'form';
