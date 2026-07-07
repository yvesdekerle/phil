-- PHIL-T01 : filigrane INFALSIFIABLE pour le destinataire. Au partage, le
-- propriétaire filigrane le document (identité du destinataire), le re-chiffre
-- avec une nouvelle DEK et stocke CE blob dédié. Le destinataire ne reçoit donc
-- QUE la version filigranée — il ne peut pas l'enlever.
--
-- document_shares porte désormais le blob filigrané (`storage_path`) et son IV
-- (`enc_file_iv`) ; `wrapped_dek` / `dek_iv` (déjà présents) emballent la DEK de
-- CE blob pour le destinataire (ECDH). Après application : `pnpm db:push` + `db:types`.

alter table public.document_shares
  add column storage_path text,
  add column enc_file_iv text;
