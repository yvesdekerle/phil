-- PHIL-Q21 — La Bourse (budget à la Tricount).
-- purse_closed_at : Bourse close (souvent quelques semaines après le voyage,
--   une fois les derniers relevés passés) — l'ajout est gelé, réouvrable.
-- split_mode : division d'une dépense — également / en parts / montants exacts.
-- expense_beneficiaries.share : nombre de parts (shares) ou montant exact
--   (exact) selon le mode ; null en division égale.

alter table public.trips
  add column purse_closed_at timestamptz;

alter table public.expenses
  add column split_mode text not null default 'equal'
    check (split_mode in ('equal', 'shares', 'exact'));

alter table public.expense_beneficiaries
  add column share numeric(12, 2);

comment on column public.trips.purse_closed_at is 'Bourse close : plus d''ajout de dépenses (null = ouverte).';
comment on column public.expenses.split_mode is 'Division : equal (également), shares (en parts), exact (montants exacts).';
comment on column public.expense_beneficiaries.share is 'Parts (shares) ou montant exact (exact) du bénéficiaire.';
