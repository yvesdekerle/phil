-- PHIL-S02 — Commerces repérés sur la carte (supermarchés, pharmacies, marchés…).
-- Après application : `pnpm db:push` puis `pnpm db:types`, ensuite la couche
-- POI de la carte du voyage peut être branchée en type-safe.

create table public.trip_places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  category text not null default 'SHOP'
    check (category in ('SUPERMARKET', 'SHOP', 'PHARMACY', 'MARKET', 'OTHER')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  note text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index trip_places_trip_idx on public.trip_places (trip_id);

alter table public.trip_places enable row level security;

-- Lecture participant ; ajout par un participant (anti-usurpation) ;
-- suppression par le créateur ou l'OWNER.
create policy "trip_places_select_members" on public.trip_places for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_places_insert_members" on public.trip_places for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "trip_places_update_members" on public.trip_places for update to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())))
  with check (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_places_delete_creator_or_owner" on public.trip_places for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

alter publication supabase_realtime add table public.trip_places;

-- ⚠️ Audit D16 / R18 : `created_by` cascade sur profiles → à ajouter à la
-- réattribution « Voyageur parti » (lib/account/deletion.ts) le moment venu.
