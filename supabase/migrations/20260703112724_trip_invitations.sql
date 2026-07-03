-- PHIL-B08 — Table trip_invitations : invitations par email avec token.
-- L'invité n'étant pas encore participant, il ne voit rien via RLS :
-- le flux d'acceptation (D06) passe par un endpoint serveur qui résout le token.

create table public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles (id),
  token uuid not null unique default gen_random_uuid(),
  role public.trip_role not null default 'EDITOR',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  -- Une seule invitation en attente par email et par voyage
  constraint trip_invitations_unique_pending unique (trip_id, invited_email)
);

comment on table public.trip_invitations is 'Invitations par email avec lien magique. Expirent après 30 jours.';

create index trip_invitations_trip_id_idx on public.trip_invitations (trip_id);

alter table public.trip_invitations enable row level security;

-- Les participants voient les invitations en attente de leur voyage.
create policy "trip_invitations_select_participant"
  on public.trip_invitations
  for select
  to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

-- OWNER et EDITOR invitent (règle 4 : modification = OWNER/EDITOR).
create policy "trip_invitations_insert_owner_editor"
  on public.trip_invitations
  for insert
  to authenticated
  with check (
    private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR')
    and invited_by = (select auth.uid())
  );

-- Annulation d'une invitation en attente.
create policy "trip_invitations_delete_owner_editor"
  on public.trip_invitations
  for delete
  to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

-- Pas de policy UPDATE : l'acceptation (accepted_at) est écrite côté serveur
-- via service role dans le flux D06.
