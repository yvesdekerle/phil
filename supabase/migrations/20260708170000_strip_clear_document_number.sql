-- PHIL-R10 — Le n° de pièce (document_number) passe en E2EE (chiffré côté client,
-- stocké dans metadata.enc_document_number). On purge toute valeur en CLAIR
-- héritée : impossible de la re-chiffrer côté serveur (pas de maîtresse), donc on
-- la supprime — l'utilisateur la ressaisit (chiffrée) au besoin. « Refaire au
-- propre » : aucune donnée d'identité en clair ne subsiste.
-- Data-only (pas de changement de schéma). À appliquer : `pnpm db:push`.

update public.documents
set metadata = metadata - 'document_number'
where metadata ? 'document_number';
