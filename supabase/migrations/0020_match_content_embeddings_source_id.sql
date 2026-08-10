-- Adds source_id to match_content_embeddings' return shape so callers can
-- join a matched chunk back to its owning row (e.g. content_audit_log's
-- entity_type/entity_id) without a second lookup keyed on title/url_path.
drop function if exists public.match_content_embeddings(vector(1024), int);

create function public.match_content_embeddings(
  query_embedding vector(1024),
  match_count int default 6
)
returns table (
  source_type text,
  source_id uuid,
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
    source_id,
    title,
    url_path,
    chunk_text,
    is_site_post,
    1 - (embedding <=> query_embedding) as similarity
  from public.content_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
