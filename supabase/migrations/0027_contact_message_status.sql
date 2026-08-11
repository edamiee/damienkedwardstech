-- Contact messages had no workflow state — every submission just sat in one
-- flat list forever. Adds a status column so admin can mark a message under
-- review ("triage") and track it through to reply/archive.
alter table public.contact_messages
  add column if not exists status text not null default 'new'
  check (status in ('new', 'triage', 'replied', 'archived'));
