-- PHIL-U07 — « Match tes activités » : le swipe façon Tinder/Bumble vote
-- directement sur les IDÉES (`trip_ideas`), plus sur un pool séparé. On étend
-- `idea_votes` du simple up-vote (cœur) à un verdict à 4 valeurs, calqué sur le
-- swipe d'activités : like (YES), super like (SUPER), dislike (NO), pourquoi pas
-- (MAYBE). La contrainte d'unicité existe déjà (PK `(idea_id, user_id)`), donc un
-- vote se fait en upsert.
--
-- Rétro-compat : les cœurs déjà posés deviennent des « like » (défaut 'YES'),
-- aucune donnée perdue. Après application : `pnpm db:push` + `pnpm db:types`.

alter table public.idea_votes
  add column verdict text not null default 'YES'
    check (verdict in ('YES', 'NO', 'MAYBE', 'SUPER')),
  -- true si un super like a été rétrogradé en like faute de quota (comme le swipe
  -- d'activités : le super like reste un signal fort, donc plafonné par voyage).
  add column quota_hit boolean not null default false;

-- `idea_votes` est déjà dans la publication temps réel (le deck et les cartes se
-- mettent à jour quand l'équipage swipe) et ses policies RLS (lecture par tout
-- participant, écriture de ses propres votes) restent valides — on n'ajoute que
-- des colonnes.
