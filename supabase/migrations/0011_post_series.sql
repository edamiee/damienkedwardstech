-- Optional grouping for multi-part posts. Posts sharing the same non-null
-- "series" value are linked with prev/next navigation, ordered by
-- series_order (falls back to publish order for ties).

alter table public.posts add column if not exists series text;
alter table public.posts add column if not exists series_order int not null default 0;
