-- Distinguishes what triggered a content-gap row: a weak-retrieval chat
-- answer (the original use), a chat answer that got a 👎 despite clearing
-- the retrieval threshold, or a /search query with no good match. All three
-- are the same underlying signal ("this content doesn't exist or isn't
-- findable") so they share one table and one admin list — this column is
-- just what tells them apart.

alter table public.chat_content_gaps
  add column source text not null default 'chat_gap'
  check (source in ('chat_gap', 'chat_downvote', 'search_gap'));
