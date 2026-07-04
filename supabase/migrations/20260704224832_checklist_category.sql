-- PHIL-Q27 — Catégorie libre sur les items de la Valise ("Vêtements",
-- "Trousse de toilette", ou une catégorie inventée par l'équipage).

alter table public.checklist_items
  add column category text check (category is null or char_length(category) <= 40);

comment on column public.checklist_items.category is 'Catégorie de rangement dans l''onglet ("Vêtements", libre).';
