-- PHIL-R18 — Profil système « Voyageur parti » lisible dans les soldes.
--
-- Le fantôme (lib/account/deletion.ts) reçoit les données de groupe d'un membre
-- qui supprime son compte (dépenses, activités, repas, courses, lieux…), pour
-- que les soldes de l'équipage restent justes. Mais ce fantôme n'est participant
-- d'AUCUN voyage → il échappe à la policy `profiles_select_cotravelers`, donc son
-- nom retombait sur le fallback (« Un voyageur ») dans le tricount et les listes
-- « payé par » / bénéficiaires.
--
-- Après application : `pnpm db:push` puis `pnpm db:types` (régénère types), puis
-- ajouter `is_system: true` à la mise à jour du fantôme dans getOrCreateGhostId
-- (deletion.ts) — voir le commentaire PHIL-R18 sur place.

alter table public.profiles
  add column is_system boolean not null default false;

-- Tout utilisateur authentifié peut lire un profil marqué système (uniquement un
-- nom d'affichage neutre, aucune donnée personnelle). Complète, sans la remplacer,
-- `profiles_select_own` et `profiles_select_cotravelers`.
create policy "profiles_select_system"
  on public.profiles
  for select
  to authenticated
  using (is_system = true);

-- Marque un éventuel fantôme déjà créé lors d'une suppression antérieure, pour
-- que sa lisibilité soit rétroactive dès l'application de la migration.
update public.profiles
set is_system = true
where id in (
  select id from auth.users where email = 'voyageur-parti@phil.internal'
);
