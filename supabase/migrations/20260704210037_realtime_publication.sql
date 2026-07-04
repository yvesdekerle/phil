-- PHIL-Q03 — Temps réel sur les votes, sondages et dépenses.
-- Ajout à la publication Realtime : les clients abonnés (postgres_changes)
-- reçoivent les changements — la RLS est appliquée par Realtime (WALRUS),
-- chacun ne reçoit que les lignes qu'il a le droit de voir.

alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.idea_votes;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_beneficiaries;
