-- PHIL-O10 — Galerie photos du voyage, quota strict (qualité d'origine,
-- nombre limité — Supabase Free = 1 Go de storage total).
-- Chemins : {uploader_id}/{photo_id}.jpg (original) et {photo_id}_thumb.jpg
-- (vignette générée côté client). Lecture via API authentifiée uniquement.

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  size_bytes bigint not null default 0,
  caption text check (caption is null or char_length(caption) <= 300),
  event_id uuid references public.trip_events (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.trip_photos is 'Photos partagées d''un voyage (quota par voyage, originaux conservés).';

create index trip_photos_trip_idx on public.trip_photos (trip_id, created_at desc);

alter table public.trip_photos enable row level security;

-- Lecture : l'équipage du voyage
create policy "trip_photos_select_members"
  on public.trip_photos for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

-- Ajout : un membre du voyage, en son nom
create policy "trip_photos_insert_members"
  on public.trip_photos for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );

-- Suppression : l'auteur de la photo ou un OWNER
create policy "trip_photos_delete_uploader_or_owner"
  on public.trip_photos for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

-- Bucket privé dédié (10 Mo max par fichier, images uniquement)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Upload : uniquement dans son propre dossier {uid}/...
create policy "photos_storage_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Pas de policy select/delete : lectures et suppressions via service role.
