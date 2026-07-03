-- PHIL-D09 — Bucket public pour les couvertures de voyage.
-- Convention de chemin : {trip_id}/{uuid}.{ext}
-- Lecture publique (image non sensible, chemin UUID non devinable) ;
-- écriture réservée aux OWNER/EDITOR du voyage du préfixe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  3145728, -- 3 Mo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "covers_storage_insert_editors"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and private.trip_role(((storage.foldername(name))[1])::uuid, (select auth.uid())) in ('OWNER', 'EDITOR')
  );

-- Remplacement de couverture : mêmes rôles
create policy "covers_storage_delete_editors"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and private.trip_role(((storage.foldername(name))[1])::uuid, (select auth.uid())) in ('OWNER', 'EDITOR')
  );
