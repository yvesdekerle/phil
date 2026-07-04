-- PHIL-N11 — Checklist partagée du voyage.
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  section text not null default 'a_emporter',
  title text not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  done boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index checklist_items_trip_idx on public.checklist_items (trip_id);

alter table public.checklist_items enable row level security;

-- Collaborative : tout participant lit, ajoute, coche et assigne.
create policy "checklist_select_members"
  on public.checklist_items for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "checklist_insert_members"
  on public.checklist_items for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "checklist_update_members"
  on public.checklist_items for update to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())))
  with check (private.is_trip_participant(trip_id, (select auth.uid())));

-- Suppression : l'auteur de l'item ou un OWNER
create policy "checklist_delete_creator_or_owner"
  on public.checklist_items for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );
