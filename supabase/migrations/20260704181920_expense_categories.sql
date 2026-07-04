-- PHIL-O09 — Catégories de dépenses + date de dépense.
-- category : suivi par poste (transport, logement, activité, resto, courses, autre).
-- spent_on : date réelle de la dépense (l'avant/pendant/après du voyage se lit
--   contre trips.start_date/end_date ; created_at ne dit que la date de saisie).

alter table public.expenses
  add column category text not null default 'autre'
    check (category in ('transport', 'logement', 'activite', 'resto', 'courses', 'autre')),
  add column spent_on date not null default current_date;

create index expenses_trip_category_idx on public.expenses (trip_id, category);

comment on column public.expenses.category is 'Poste de dépense (transport, logement, activite, resto, courses, autre).';
comment on column public.expenses.spent_on is 'Date de la dépense (≠ date de saisie).';
