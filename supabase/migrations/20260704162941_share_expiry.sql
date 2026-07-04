-- PHIL-N05 — Partage de document à durée limitée.
-- expires_at NULL = permanent ; passé = le partage ne donne plus accès
-- (purge par le cron quotidien).

alter table public.document_shares add column expires_at timestamptz;

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
      and (ds.expires_at is null or ds.expires_at > now())
  );
$$;

-- Côté destinataire, une ligne expirée disparaît aussi de la liste
drop policy "document_shares_select_owner_or_recipient" on public.document_shares;
create policy "document_shares_select_owner_or_recipient"
  on public.document_shares
  for select
  to authenticated
  using (
    private.is_document_owner(document_id, (select auth.uid()))
    or (
      private.is_trip_participant(trip_id, (select auth.uid()))
      and (shared_with is null or shared_with = (select auth.uid()))
      and (expires_at is null or expires_at > now())
    )
  );
