-- PHIL-S01 — Onglet « Miam » : repas planifiés + liste de courses partagée.
-- Après application : `pnpm db:push` puis `pnpm db:types` (régénère types/database.ts),
-- ensuite l'UI de l'onglet peut être branchée en type-safe.

-- Repas planifiés (qui cuisine quoi et quand).
create table public.trip_meals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('BREAKFAST', 'LUNCH', 'DINNER', 'OTHER')),
  title text not null check (char_length(title) between 1 and 200),
  cook_id uuid references public.profiles (id) on delete set null,
  notes text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Liste de courses partagée (articles cochables).
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  quantity text,
  checked boolean not null default false,
  checked_by uuid references public.profiles (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index trip_meals_trip_idx on public.trip_meals (trip_id, day);
create index shopping_items_trip_idx on public.shopping_items (trip_id);

alter table public.trip_meals enable row level security;
alter table public.shopping_items enable row level security;

-- Collaboratif comme la checklist : lecture + création + édition par tout
-- participant (anti-usurpation à l'insert) ; suppression par le créateur ou l'OWNER.
create policy "trip_meals_select_members" on public.trip_meals for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_meals_insert_members" on public.trip_meals for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "trip_meals_update_members" on public.trip_meals for update to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())))
  with check (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_meals_delete_creator_or_owner" on public.trip_meals for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

create policy "shopping_items_select_members" on public.shopping_items for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "shopping_items_insert_members" on public.shopping_items for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "shopping_items_update_members" on public.shopping_items for update to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())))
  with check (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "shopping_items_delete_creator_or_owner" on public.shopping_items for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

-- Temps réel (comme les autres tables collaboratives, cf. 20260704210037).
alter publication supabase_realtime add table public.trip_meals;
alter publication supabase_realtime add table public.shopping_items;

-- ⚠️ Audit D16 / R18 : `created_by` cascade sur profiles. Ces tables portent de
-- la donnée de groupe → ajouter trip_meals/shopping_items à la réattribution
-- « Voyageur parti » dans lib/account/deletion.ts (reassignGroupDataToGhost).
