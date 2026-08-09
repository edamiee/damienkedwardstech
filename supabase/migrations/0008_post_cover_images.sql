-- Adds a cover image to blog posts, and a public storage bucket to hold
-- post images (both the cover image and any images inserted inline into a
-- post's markdown body via the admin editor).

alter table public.posts add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "public reads post-images" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "admin writes post-images" on storage.objects
  for all using (bucket_id = 'post-images' and public.is_admin())
  with check (bucket_id = 'post-images' and public.is_admin());
