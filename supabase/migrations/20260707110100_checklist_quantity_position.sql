-- PHIL-S04 — Valise : quantité optionnelle + réordonnancement des éléments.
-- Le champ « date » (due_date) reste en base mais sera masqué du formulaire (UI).
-- Le réordonnancement des CATÉGORIES (texte libre aujourd'hui) demande un
-- mécanisme d'ordre distinct — à cadrer (voir ticket S04).
-- Après application : `pnpm db:push` puis `pnpm db:types`.

alter table public.checklist_items
  add column quantity text,
  add column position integer not null default 0;

create index checklist_items_order_idx on public.checklist_items (trip_id, position);
