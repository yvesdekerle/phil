-- PHIL-Q12 — Position des photos (carte de l'onglet Photos).
-- Extraites des données GPS EXIF côté client au moment de l'upload.

alter table public.trip_photos
  add column lat double precision,
  add column lng double precision;

comment on column public.trip_photos.lat is 'Latitude GPS EXIF de la photo (extraite à l''upload).';
comment on column public.trip_photos.lng is 'Longitude GPS EXIF de la photo (extraite à l''upload).';
