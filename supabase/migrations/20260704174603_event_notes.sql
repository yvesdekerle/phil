-- PHIL-O04 — Notes sous les événements.
-- Fil de notes courtes ("le resto est fermé le lundi") sous chaque événement.
-- Pas un chat : pas d'édition, suppression par l'auteur ou un OWNER.

create table public.event_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.trip_events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.event_notes is 'Notes des voyageurs sous un événement (précisions, changements de RDV).';

create index event_notes_event_idx on public.event_notes (event_id, created_at);

alter table public.event_notes enable row level security;

-- Lecture : tout participant du voyage de l'événement
create policy "event_notes_select_trip_members"
  on public.event_notes
  for select
  to authenticated
  using (
    private.is_trip_participant(private.event_trip_id(event_id), (select auth.uid()))
  );

-- Ajout : un participant du voyage, en son nom uniquement
create policy "event_notes_insert_members"
  on public.event_notes
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_trip_participant(private.event_trip_id(event_id), (select auth.uid()))
  );

-- Suppression : l'auteur de la note ou un OWNER du voyage
create policy "event_notes_delete_author_or_owner"
  on public.event_notes
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or private.trip_role(private.event_trip_id(event_id), (select auth.uid())) = 'OWNER'
  );
