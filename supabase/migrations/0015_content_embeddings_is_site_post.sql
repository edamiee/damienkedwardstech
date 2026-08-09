alter table public.content_embeddings add column if not exists is_site_post boolean not null default false;

-- Return type is changing (new column), so the function must be dropped and
-- recreated rather than replaced in place.
drop function if exists public.match_content_embeddings(vector(1024), int);

create function public.match_content_embeddings(
  query_embedding vector(1024),
  match_count int default 6
)
returns table (
  source_type text,
  title text,
  url_path text,
  chunk_text text,
  is_site_post boolean,
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
    is_site_post,
    1 - (embedding <=> query_embedding) as similarity
  from public.content_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
