-- Thumbs up/down on chat widget answers. Distinct from chat_content_gaps
-- (which flags weak retrieval matches before Claude even answers) — this
-- catches the case retrieval found something and Claude answered, but the
-- answer itself missed the mark.

create table public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  rating text not null check (rating in ('up', 'down')),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_feedback_created_at_idx on public.chat_feedback (created_at desc);

alter table public.chat_feedback enable row level security;

-- No public policy — written only via the service-role client from the
-- feedback route, read only by admins.
create policy "admin full access to chat feedback" on public.chat_feedback
  for all using (public.is_admin()) with check (public.is_admin());
