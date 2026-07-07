-- PHIL-S03 — Autoriser le retrait de son propre vote.
-- Il manquait une policy DELETE sur poll_votes : la désélection en choix
-- multiple (et le remplacement de vote en choix simple, qui fait delete+insert)
-- étaient refusés silencieusement par RLS. On autorise un participant à retirer
-- SON vote tant que le sondage n'est pas clos.
-- Après application : `pnpm db:push` puis `pnpm verify:rls` (policy seule, pas de type).

create policy "poll_votes_delete_own_open" on public.poll_votes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls p
      where p.id = poll_id and p.closed_at is null
    )
  );
