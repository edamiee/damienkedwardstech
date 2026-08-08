-- Optional example rows — edit the URLs/emails then run manually. Not part
-- of the migrations, so it never runs automatically.

insert into public.site_projects (slug, name, description, url, sort_order)
values (
  'arcade',
  'Penelope''s Learning Arcade',
  'A retro arcade-style quiz game built for the classroom.',
  'https://REPLACE-WITH-ARCADE-DOMAIN',
  0
);

-- Grant someone access to the gated /projects area:
-- insert into public.project_viewer_invites (email, note)
-- values ('someone@example.com', 'potential client — showed them Arcade');
