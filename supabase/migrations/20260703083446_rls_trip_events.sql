-- PHIL-B11 — Politiques RLS sur trip_events et event_documents.
-- (trip_ideas n'existe pas encore : ses policies arriveront avec la migration B06.)

create or replace function private.event_trip_id(p_event_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select trip_id from public.trip_events where id = p_event_id;
$$;

grant execute on function private.event_trip_id(uuid) to authenticated;

-- ============ trip_events ============

create policy "trip_events_select_participant"
  on public.trip_events
  for select
  to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_events_insert_owner_editor"
  on public.trip_events
  for insert
  to authenticated
  with check (
    private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR')
    and created_by = (select auth.uid())
  );

create policy "trip_events_update_owner_editor"
  on public.trip_events
  for update
  to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'))
  with check (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

create policy "trip_events_delete_owner_or_creator"
  on public.trip_events
  for delete
  to authenticated
  using (
    private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
    or created_by = (select auth.uid())
  );

-- ============ event_documents ============

create policy "event_documents_select_participant"
  on public.event_documents
  for select
  to authenticated
  using (private.is_trip_participant(private.event_trip_id(event_id), (select auth.uid())));

create policy "event_documents_insert_owner_editor"
  on public.event_documents
  for insert
  to authenticated
  with check (
    private.trip_role(private.event_trip_id(event_id), (select auth.uid())) in ('OWNER', 'EDITOR')
  );

create policy "event_documents_delete_owner_editor"
  on public.event_documents
  for delete
  to authenticated
  using (
    private.trip_role(private.event_trip_id(event_id), (select auth.uid())) in ('OWNER', 'EDITOR')
  );
