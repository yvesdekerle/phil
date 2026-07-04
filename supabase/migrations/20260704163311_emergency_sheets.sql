-- PHIL-N06 — Fiche d'urgence par voyageur et par voyage.
-- Partagée avec l'équipage (c'est son but : retrouver l'info en urgence),
-- modifiable uniquement par son titulaire.

create table public.emergency_sheets (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emergency_contacts text,
  insurance_policy text,
  insurance_phone text,
  blood_group text,
  allergies text,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.emergency_sheets enable row level security;

create policy "emergency_sheets_select_trip_members"
  on public.emergency_sheets
  for select
  to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "emergency_sheets_write_own"
  on public.emergency_sheets
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );
