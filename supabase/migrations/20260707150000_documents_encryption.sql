-- PHIL-T01 Phase 1 — Métadonnées de chiffrement E2EE sur les documents.
-- Un document chiffré stocke dans Supabase Storage le FICHIER CHIFFRÉ (ciphertext).
-- La DEK (clé du fichier) est emballée par la clé maîtresse de l'utilisateur, elle
-- même scellée par la biométrie (PRF). Le serveur ne peut donc jamais déchiffrer.
-- Additif et rétrocompatible : les documents existants restent `encrypted = false`.
-- Après application : `pnpm db:push` puis `pnpm db:types`.

alter table public.documents
  add column encrypted boolean not null default false,
  add column enc_file_iv text,       -- IV AES-GCM du fichier (base64)
  add column enc_wrapped_dek text,   -- DEK emballée par la maîtresse (base64)
  add column enc_dek_iv text;        -- IV de l'emballage de la DEK (base64)

-- Cohérence : si chiffré, les trois métadonnées sont obligatoires.
alter table public.documents
  add constraint documents_encryption_metadata_ck check (
    encrypted = false
    or (enc_file_iv is not null and enc_wrapped_dek is not null and enc_dek_iv is not null)
  );
