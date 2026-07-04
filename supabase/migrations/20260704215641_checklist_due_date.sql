-- PHIL-Q20 — Date optionnelle sur les items de la Valise ("à faire avant le…").

alter table public.checklist_items
  add column due_date date;

comment on column public.checklist_items.due_date is 'Échéance optionnelle de l''item ("vaccins avant le 5 octobre").';
