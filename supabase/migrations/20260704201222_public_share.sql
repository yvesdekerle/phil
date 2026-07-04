-- PHIL-P03 — Partage public en lecture seule (façon Polarsteps).
-- public_token non nul = page /p/{token} active (itinéraire + carte, rien
-- d'autre). Révocable en le remettant à null. La page publique lit via
-- service role : aucune policy RLS anonyme n'est ouverte.

alter table public.trips
  add column public_token uuid unique;

comment on column public.trips.public_token is 'Jeton du partage public /p/{token} (null = désactivé).';
