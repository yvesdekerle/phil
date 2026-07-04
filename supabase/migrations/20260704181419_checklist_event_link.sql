-- PHIL-O05 — "À emporter" par activité.
-- Un item de checklist peut être rattaché à un événement ("snorkeling →
-- maillot") : il apparaît sur la fiche événement ET dans la Valise.
-- Les politiques RLS existantes (par trip_id) restent valables.

alter table public.checklist_items
  add column event_id uuid references public.trip_events (id) on delete cascade;

create index checklist_items_event_idx on public.checklist_items (event_id)
  where event_id is not null;

comment on column public.checklist_items.event_id is 'Événement auquel l''item est rattaché (optionnel — "à emporter pour cette activité").';
