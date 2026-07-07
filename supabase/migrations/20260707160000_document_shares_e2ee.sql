-- PHIL-T01 Phase 3 — Partage E2EE. La DEK du document est ré-emballée pour le
-- destinataire via ECDH (clé publique du destinataire + privée du propriétaire).
-- Le destinataire la déballe avec sa privée + la publique du propriétaire, puis
-- déchiffre le fichier. Additif : partages non chiffrés / équipage restent NULL.
-- Après application : `pnpm db:push` puis `pnpm db:types`.

alter table public.document_shares
  add column wrapped_dek text,
  add column dek_iv text;
