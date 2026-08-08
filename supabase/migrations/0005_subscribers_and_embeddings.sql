-- Adds email capture for the weekly AI insight and a pgvector store for the
-- site's RAG chat widget. Runs against the same shared Supabase project as
-- the earlier migrations.

-- ---------- Email capture (capture-only — no automated sending yet) ----------

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text not null default 'weekly_insight', -- where the signup happened
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

-- Anyone can sign up (insert their own email), nobody but admin can read the
-- list back — this is a write-only mailbox from the public's point of view.
create policy "anyone can subscribe" on public.subscribers
  for insert with check (true);
create policy "admin full access to subscribers" on public.subscribers
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- RAG chat: content embeddings ----------

create extension if not exists vector;

-- Chunked, embedded copies of published posts/papers/case studies, used by
-- the /api/chat endpoint to ground answers in the site's actual content.
-- Rebuilt by the admin "reindex" action — not user-editable directly.
create table public.content_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_type text not null, -- 'post' | 'paper' | 'case_study'
  source_id uuid not null,
  title text not null,
  url_path text not null,
  chunk_text text not null,
  embedding vector(1024) not null, -- voyage-3 output dimension
  created_at timestamptz not null default now(),
  unique (source_type, source_id, chunk_text)
);

create index content_embeddings_embedding_idx on public.content_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.content_embeddings enable row level security;

-- No public policy at all: the chat route reads this via the service-role
-- admin client, never via a user session, so RLS stays admin-only.
create policy "admin full access to content embeddings" on public.content_embeddings
  for all using (public.is_admin()) with check (public.is_admin());

-- Cosine-similarity search used by /api/chat. security definer so the
-- service-role call bypasses RLS the same way direct admin-client reads do.
create or replace function public.match_content_embeddings(
  query_embedding vector(1024),
  match_count int default 6
)
returns table (
  source_type text,
  title text,
  url_path text,
  chunk_text text,
  similarity float
)
language sql
security definer
stable
as $$
  select
    source_type,
    title,
    url_path,
    chunk_text,
    1 - (embedding <=> query_embedding) as similarity
  from public.content_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
