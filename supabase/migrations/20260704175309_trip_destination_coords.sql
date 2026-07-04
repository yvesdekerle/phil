-- PHIL-O02 — Coordonnées de la destination du voyage (pour la météo Open-Meteo).
-- Remplies par géocodage Nominatim à la création/édition du voyage,
-- backfill best-effort au premier affichage de la météo.

alter table public.trips
  add column destination_lat double precision,
  add column destination_lng double precision;

comment on column public.trips.destination_lat is 'Latitude de la destination (géocodage Nominatim, best-effort).';
comment on column public.trips.destination_lng is 'Longitude de la destination (géocodage Nominatim, best-effort).';
