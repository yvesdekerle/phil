-- PHIL-P02 — Import de réservation par email.
-- trips.email_alias : partie locale de l'adresse d'import du voyage
--   (ex. maurice-x7f2@import.<domaine>) — généré à la demande.
-- import_drafts : réservations reçues par email, en attente de validation
--   (jamais de création silencieuse d'événement). Écrites uniquement par le
--   webhook (service role) ; lues/traitées par les OWNER/EDITOR du voyage.

alter table public.trips
  add column email_alias text unique
    check (email_alias is null or email_alias ~ '^[a-z0-9-]{4,40}$');

create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender text not null,
  subject text,
  extracted jsonb not null,
  -- pièce jointe stockée par le webhook dans le bucket documents (dossier inbound/)
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'PENDING' check (status in ('PENDING', 'DONE', 'DISMISSED')),
  created_at timestamptz not null default now()
);

comment on table public.import_drafts is 'Réservations reçues par email, à valider avant création d''événement (PHIL-P02).';

create index import_drafts_trip_idx on public.import_drafts (trip_id, status);

alter table public.import_drafts enable row level security;

-- Lecture et traitement : OWNER/EDITOR du voyage (comme la création d'événements).
-- Pas de policy INSERT : seul le webhook (service role) écrit.
create policy "import_drafts_select_editors"
  on public.import_drafts for select to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

create policy "import_drafts_update_editors"
  on public.import_drafts for update to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'))
  with check (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

create policy "import_drafts_delete_editors"
  on public.import_drafts for delete to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));
