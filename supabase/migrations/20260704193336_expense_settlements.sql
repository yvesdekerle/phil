-- PHIL-P04 — Remboursements du tricount.
-- Un remboursement est une transaction "payée par le débiteur au seul
-- bénéfice du créancier" : les soldes se remettent à zéro naturellement.
-- Le flag l'exclut du Suivi par catégories (ce n'est pas une dépense).

alter table public.expenses
  add column is_settlement boolean not null default false;

comment on column public.expenses.is_settlement is 'Remboursement entre voyageurs (exclu du suivi des dépenses).';
