-- PHIL-B10 — Politiques RLS sur documents et document_shares.
-- LA politique la plus critique du projet : règles de partage 1, 2 et 5 de CLAUDE.md.
-- Helpers security definer pour casser la récursion documents <-> document_shares.

create or replace function private.is_document_owner(p_document_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.documents
    where id = p_document_id and owner_id = p_user_id
  );
$$;

create or replace function private.document_is_vault(p_document_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.documents
    where id = p_document_id and scope = 'VAULT'
  );
$$;

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
  );
$$;

grant execute on function private.is_document_owner(uuid, uuid) to authenticated;
grant execute on function private.document_is_vault(uuid) to authenticated;
grant execute on function private.is_document_shared_with_user(uuid, uuid) to authenticated;

-- ============ documents ============

-- Règle 1 : un doc VAULT n'est visible que de son propriétaire, sauf partage
-- explicite vers un voyage dont le visiteur est participant.
-- Règle 2 : un doc TRIP est visible de tous les participants du voyage.
create policy "documents_select_owner_trip_or_shared"
  on public.documents
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      scope = 'TRIP'
      and private.is_trip_participant(trip_id, (select auth.uid()))
    )
    or (
      scope = 'VAULT'
      and private.is_document_shared_with_user(id, (select auth.uid()))
    )
  );

-- Un user ne crée que ses propres documents ; un doc TRIP exige d'être
-- OWNER ou EDITOR du voyage.
create policy "documents_insert_own"
  on public.documents
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      scope = 'VAULT'
      or private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR')
    )
  );

-- Règle 5 : modification par le propriétaire uniquement.
create policy "documents_update_owner"
  on public.documents
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Règle 5 : suppression par le propriétaire, ou par un OWNER du voyage
-- pour les documents scope=TRIP.
create policy "documents_delete_owner_or_trip_owner"
  on public.documents
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      scope = 'TRIP'
      and private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
    )
  );

-- ============ document_shares ============

create policy "document_shares_select_owner_or_participant"
  on public.document_shares
  for select
  to authenticated
  using (
    private.is_document_owner(document_id, (select auth.uid()))
    or private.is_trip_participant(trip_id, (select auth.uid()))
  );

-- Seul le propriétaire partage, uniquement un doc de son coffre (VAULT),
-- uniquement vers un voyage dont il est participant.
create policy "document_shares_insert_owner"
  on public.document_shares
  for insert
  to authenticated
  with check (
    shared_by = (select auth.uid())
    and private.is_document_owner(document_id, (select auth.uid()))
    and private.document_is_vault(document_id)
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );

-- Retirer un partage : le propriétaire du document uniquement.
create policy "document_shares_delete_owner"
  on public.document_shares
  for delete
  to authenticated
  using (private.is_document_owner(document_id, (select auth.uid())));
