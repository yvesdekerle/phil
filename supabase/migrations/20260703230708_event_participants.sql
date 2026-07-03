-- PHIL-F11 — Participants optionnels d'un événement.
-- Sans inscription, l'événement concerne tout le groupe ; sinon la liste
-- indique qui est de la partie (plongée à 5 sur 9, etc.).

create table public.event_participants (
  event_id uuid not null references public.trip_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table public.event_participants is 'Qui participe à un événement (optionnel — vide = tout le groupe).';

alter table public.event_participants enable row level security;

-- Lecture : tout participant du voyage de l'événement
create policy "event_participants_select_trip_members"
  on public.event_participants
  for select
  to authenticated
  using (
    private.is_trip_participant(private.event_trip_id(event_id), (select auth.uid()))
  );

-- Inscription : soi-même (si membre du voyage), ou n'importe quel membre
-- si on est OWNER/EDITOR du voyage
create policy "event_participants_insert"
  on public.event_participants
  for insert
  to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and private.is_trip_participant(private.event_trip_id(event_id), (select auth.uid()))
    )
    or private.trip_role(private.event_trip_id(event_id), (select auth.uid())) in ('OWNER', 'EDITOR')
  );

-- Retrait : mêmes règles que l'inscription
create policy "event_participants_delete"
  on public.event_participants
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.trip_role(private.event_trip_id(event_id), (select auth.uid())) in ('OWNER', 'EDITOR')
  );
