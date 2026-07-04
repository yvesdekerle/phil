-- PHIL-L01 — Hébergements candidats (multi-options avant choix).
-- Concept dédié (et non un statut CANDIDATE sur trip_events : calendrier,
-- iCal, rappels et carte supposent des événements réels).
-- Un "créneau" = même paire check_in/check_out ; en choisir plusieurs sur un
-- même créneau reste possible (groupe > capacité d'un seul logement).

create table public.lodging_candidates (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  url text,
  price text check (price is null or char_length(price) <= 100),
  notes text check (notes is null or char_length(notes) <= 1000),
  check_in date not null,
  check_out date not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CHOSEN', 'REJECTED')),
  chosen_event_id uuid references public.trip_events (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint lodging_candidates_dates_check check (check_out >= check_in)
);

comment on table public.lodging_candidates is 'Options d''hébergement à comparer avant de trancher (PHIL-L01).';

create index lodging_candidates_trip_idx on public.lodging_candidates (trip_id, check_in);

alter table public.lodging_candidates enable row level security;

-- Lecture : l'équipage
create policy "lodging_candidates_select_members"
  on public.lodging_candidates for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

-- Proposition : tout membre du voyage, en son nom (collaboratif comme les idées)
create policy "lodging_candidates_insert_members"
  on public.lodging_candidates for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );

-- Choix / rejet : OWNER ou EDITOR (comme la création d'événements)
create policy "lodging_candidates_update_editors"
  on public.lodging_candidates for update to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'))
  with check (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

-- Suppression : l'auteur du candidat ou un OWNER
create policy "lodging_candidates_delete_creator_or_owner"
  on public.lodging_candidates for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );
