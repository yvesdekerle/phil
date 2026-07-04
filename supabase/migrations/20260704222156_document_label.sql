-- PHIL-Q26 — Libellé libre sur les documents du voyage ("Forfait de ski").
-- Les catégories fermées restent utiles au coffre (passeport, CNI…) ; côté
-- voyage, un texte libre colle mieux aux cas particuliers.

alter table public.documents
  add column label text check (label is null or char_length(label) <= 60);

comment on column public.documents.label is 'Libellé libre du document ("Forfait de ski") — prioritaire sur la catégorie à l''affichage.';
