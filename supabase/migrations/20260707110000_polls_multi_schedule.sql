-- PHIL-S03 — Sondages : choix simple/multiple + date de fin programmée.
-- « Qui a voté quoi » utilise déjà poll_votes.user_id/option_index (RLS membres) :
-- pas de schéma, UI seule.
-- Après application : `pnpm db:push` puis `pnpm db:types`.

alter table public.polls
  add column allow_multiple boolean not null default false,
  -- Fin programmée, distincte de closed_at (clôture effective/manuelle).
  add column closes_at timestamptz;

-- Choix multiple : un même utilisateur peut cocher plusieurs options.
-- La PK passe de (poll_id, user_id) à (poll_id, user_id, option_index).
-- En mode simple (allow_multiple = false), l'action de vote remplacera le vote
-- précédent côté applicatif (delete puis insert).
alter table public.poll_votes drop constraint poll_votes_pkey;
alter table public.poll_votes add primary key (poll_id, user_id, option_index);
