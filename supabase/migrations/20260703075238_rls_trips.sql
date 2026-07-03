-- PHIL-B09 — Politiques RLS sur trips et trip_participants.
-- Helpers security definer dans le schéma `private` (non exposé par PostgREST)
-- pour éviter la récursion infinie des policies qui se lisent elles-mêmes.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_trip_participant(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.trip_participants
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;

create or replace function private.trip_role(p_trip_id uuid, p_user_id uuid)
returns public.trip_role
language sql
security definer
set search_path = ''
stable
as $$
  select role
  from public.trip_participants
  where trip_id = p_trip_id and user_id = p_user_id;
$$;

grant execute on function private.is_trip_participant(uuid, uuid) to authenticated;
grant execute on function private.trip_role(uuid, uuid) to authenticated;

-- ============ trips ============

create policy "trips_select_participant"
  on public.trips
  for select
  to authenticated
  using (private.is_trip_participant(id, (select auth.uid())));

create policy "trips_insert_own"
  on public.trips
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "trips_update_owner_editor"
  on public.trips
  for update
  to authenticated
  using (private.trip_role(id, (select auth.uid())) in ('OWNER', 'EDITOR'))
  with check (private.trip_role(id, (select auth.uid())) in ('OWNER', 'EDITOR'));

create policy "trips_delete_owner"
  on public.trips
  for delete
  to authenticated
  using (private.trip_role(id, (select auth.uid())) = 'OWNER');

-- ============ trip_participants ============

create policy "trip_participants_select_coparticipant"
  on public.trip_participants
  for select
  to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

-- L'ajout de participants passe par un OWNER (les invitations D06 passeront
-- par un flux dédié ; le trigger handle_new_trip est security definer et bypasse).
create policy "trip_participants_insert_owner"
  on public.trip_participants
  for insert
  to authenticated
  with check (private.trip_role(trip_id, (select auth.uid())) = 'OWNER');

create policy "trip_participants_update_owner"
  on public.trip_participants
  for update
  to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) = 'OWNER')
  with check (private.trip_role(trip_id, (select auth.uid())) = 'OWNER');

-- OWNER retire qui il veut ; chacun peut quitter un voyage (D07 gèrera
-- la contrainte "dernier OWNER doit transférer avant de partir" côté applicatif).
create policy "trip_participants_delete_owner_or_self"
  on public.trip_participants
  for delete
  to authenticated
  using (
    private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
    or user_id = (select auth.uid())
  );
