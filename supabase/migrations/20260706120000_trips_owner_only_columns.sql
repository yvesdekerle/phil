-- Audit B10 — Escalade verticale EDITOR→OWNER.
-- La policy RLS `trips_update_owner_editor` autorise l'UPDATE de la ligne à
-- OWNER *et* EDITOR, sans distinction de colonne. Or plusieurs colonnes sont
-- réservées à l'OWNER côté applicatif seulement (public_token, archived_at,
-- email_alias, created_by) : un EDITOR peut les modifier en appelant PostgREST
-- directement, en contournant les server actions. Ce trigger porte la
-- restriction au niveau colonne, en base — dernière ligne de défense.
--
-- Après application : `pnpm db:push` puis `pnpm verify:rls`.

create or replace function private.enforce_trip_owner_only_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service role / triggers internes (pas de session auth) : bypass légitime
  -- (deletion.ts réassigne created_by, handle_new_trip, etc.).
  if (select auth.uid()) is null then
    return new;
  end if;

  -- OWNER : toutes les colonnes autorisées.
  if private.trip_role(old.id, (select auth.uid())) = 'OWNER' then
    return new;
  end if;

  -- Non-OWNER (EDITOR) : les colonnes sensibles doivent rester inchangées.
  if new.public_token is distinct from old.public_token
     or new.archived_at is distinct from old.archived_at
     or new.email_alias is distinct from old.email_alias
     or new.created_by is distinct from old.created_by then
    raise exception 'Seul le capitaine peut modifier ces réglages du voyage'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trips_owner_only_columns on public.trips;
create trigger trips_owner_only_columns
  before update on public.trips
  for each row
  execute function private.enforce_trip_owner_only_columns();
