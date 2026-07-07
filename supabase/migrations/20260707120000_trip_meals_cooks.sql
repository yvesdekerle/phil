-- PHIL-S01 — Plusieurs cuisiniers par repas.
-- `cook_ids` (tableau) remplace l'usage de `cook_id` (unique). La colonne
-- `cook_id` est conservée pour l'instant (dette : à retirer plus tard).
-- Après application : `pnpm db:push` puis `pnpm db:types`.

alter table public.trip_meals add column cook_ids uuid[] not null default '{}';

-- Migre l'assignation unique existante vers le tableau.
update public.trip_meals set cook_ids = array[cook_id] where cook_id is not null;
