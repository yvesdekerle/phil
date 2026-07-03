-- PHIL-D08 (bug découvert) — les profils des co-voyageurs doivent être lisibles :
-- participants, créateurs d'idées, "Ajouté par", carnet d'amis. Jusqu'ici,
-- profiles_select_own limitait la lecture à soi-même et tous les noms des
-- autres retombaient sur le fallback.

create or replace function private.shares_trip_with(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.trip_participants mine
    join public.trip_participants theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_profile_id
  );
$$;

create policy "profiles_select_cotravelers"
  on public.profiles
  for select
  to authenticated
  using (private.shares_trip_with(id));
