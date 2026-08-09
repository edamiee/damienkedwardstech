-- Adds: a real contact form (contact_messages), tags + reading time on
-- posts, and a nearest-neighbor "related content" RPC built on top of the
-- existing content_embeddings table from 0005.

-- ---------- Contact form ----------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Same shape as subscribers: anyone can submit, only admin can read back.
create policy "anyone can send a contact message" on public.contact_messages
  for insert with check (true);
create policy "admin full access to contact messages" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Post tags + reading time ----------

alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists reading_minutes int not null default 1;

-- ---------- Related content ----------

-- Finds other indexed content whose embedding is nearest to the given
-- post/case study's own embedding, excluding itself and excluding gated
-- project teasers (they all share the generic /projects url_path, which
-- isn't useful as a specific "related reading" link).
create or replace function public.match_related_content(
  p_source_type text,
  p_source_id uuid,
  match_count int default 3
)
returns table (
  source_type text,
  title text,
  url_path text,
  similarity float
)
language sql
security definer
stable
as $$
  with target as (
    select embedding
    from public.content_embeddings
    where source_type = p_source_type and source_id = p_source_id
    limit 1
  ),
  ranked as (
    select
      ce.source_type,
      ce.title,
      ce.url_path,
      1 - (ce.embedding <=> target.embedding) as similarity,
      row_number() over (
        partition by ce.source_type, ce.url_path
        order by ce.embedding <=> target.embedding
      ) as rn
    from public.content_embeddings ce, target
    where ce.source_type != 'project'
      and not (ce.source_type = p_source_type and ce.source_id = p_source_id)
  )
  select source_type, title, url_path, similarity
  from ranked
  where rn = 1
  order by similarity desc
  limit match_count;
$$;
