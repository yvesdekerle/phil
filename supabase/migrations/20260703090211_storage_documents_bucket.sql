-- PHIL-E02 — Bucket Storage privé pour les documents.
-- Convention de chemin : {owner_id}/{document_id}.{ext}
-- Lecture : AUCUNE policy SELECT pour authenticated — toute lecture passe par
-- l'endpoint API authentifié (service role), qui logge dans vault_access_log.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 Mo
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Upload : uniquement dans son propre dossier {uid}/...
create policy "documents_storage_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Pas de policy select/update/delete : lectures et suppressions via service role.
