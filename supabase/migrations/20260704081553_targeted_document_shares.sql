-- PHIL-E09 — Partage ciblé d'un document du coffre.
-- shared_with NULL = tout l'équipage (comportement historique inchangé) ;
-- sinon, seul le destinataire voit le document. Amende la règle critique n°1.

alter table public.document_shares
  add column shared_with uuid references public.profiles (id) on delete cascade;

comment on column public.document_shares.shared_with is
  'NULL = partagé avec tout l''équipage du voyage ; sinon, uniquement avec cette personne.';

-- Unicité étendue : un partage équipage ET des partages ciblés peuvent
-- coexister pour le même document/voyage, mais pas de doublon exact.
alter table public.document_shares drop constraint document_shares_unique;
alter table public.document_shares
  add constraint document_shares_unique unique nulls not distinct (document_id, trip_id, shared_with);

-- Le partage vaut pour l'utilisateur si équipage entier ou s'il est la cible.
create or replace function private.is_document_shared_with_user(p_document_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.document_shares ds
    join public.trip_participants tp on tp.trip_id = ds.trip_id
    where ds.document_id = p_document_id
      and tp.user_id = p_user_id
      and (ds.shared_with is null or ds.shared_with = p_user_id)
  );
$$;

-- Un participant ne voit pas les lignes de partage ciblées vers d'autres
-- (sinon l'existence même du partage fuiterait).
drop policy "document_shares_select_owner_or_participant" on public.document_shares;
create policy "document_shares_select_owner_or_recipient"
  on public.document_shares
  for select
  to authenticated
  using (
    private.is_document_owner(document_id, (select auth.uid()))
    or (
      private.is_trip_participant(trip_id, (select auth.uid()))
      and (shared_with is null or shared_with = (select auth.uid()))
    )
  );
