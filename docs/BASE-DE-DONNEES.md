# Base de données : environnements local / prod (PHIL-U05)

Clarifie **comment le dev et la prod partagent (aujourd'hui) la même base**, le
risque que ça pose, et le chemin pour les séparer. La **mise en place** de la
séparation est le ticket **PHIL-R11** ; ce document en est la clarification.

## État actuel (v1) — une seule base pour tout

Il existe **un seul projet Supabase distant** : `phil` (ref `xinbuahgscaydpkcamsl`,
Postgres 17), lié au repo via la CLI (`supabase link`). Il n'y a **pas de stack
Supabase locale** (`supabase start` / Docker n'est pas utilisé — choix assumé dans
`CLAUDE.md`).

Conséquence : **tout tape sur ce même projet distant**, via les variables de
`.env.local` (et les mêmes variables côté Vercel) :

| Opération | Cible réelle |
|---|---|
| `pnpm dev` (app locale) | base **distante** `phil` |
| `pnpm db:push` (migrations) | base **distante** `phil` |
| `pnpm db:types` (types) | schéma **distant** `phil` |
| `pnpm verify:rls` (users jetables) | base **distante** `phil` |
| `scripts/seed-*.ts` (données démo) | base **distante** `phil` |
| Preview Vercel (branches) | mêmes env vars → base `phil` |
| **Production** Vercel (`main`) | base `phil` |

Autrement dit : **dev, preview et prod pointent sur la même base**, celle qui
contient (ou contiendra) les **vraies pièces d'identité** du coffre.

## Le risque

Partager une base unique entre dev et prod signifie qu'une action de dev peut
atteindre les données réelles :

- une **migration ratée** ou destructrice appliquée par `db:push` touche la prod ;
- un **`supabase db reset`** lancé par erreur contre le projet lié **efface tout** ;
- un **seed** (`seed-demo-maurice`, `seed-iceland`) écrit des données de démo dans
  la base de prod ;
- `verify:rls` **crée et supprime des utilisateurs jetables** directement en prod
  (il nettoie derrière lui, mais opère sur la vraie base) ;
- pas de terrain de jeu pour tester une migration sensible **avant** de l'appliquer.

C'est le cœur du ticket **R11**. Tant qu'il n'y a presque pas de données réelles,
le risque est théorique ; il devient concret dès que des passeports sont dans le
coffre en prod.

## Options de séparation

### A — Stack Supabase locale (`supabase start`)

Un Postgres + Auth + Storage **locaux** via Docker. `config.toml` est déjà présent.

- **Pour** : isolation totale du dev, gratuit, idéal pour **tester migrations et
  seeds destructifs sans aucun risque** ; permet un `db reset` sans conséquence.
- **Contre** : nécessite Docker ; flux à adapter (migrations appliquées en local,
  `db:types` sur la base locale, env vars locales issues de `supabase start`) ;
  s'écarte du choix initial « pas de stack locale ».
- **Bascule** : pointer `.env.local` sur l'URL/anon/service_role imprimés par
  `supabase start`, puis `supabase db reset` (rejoue les migrations) + seed local.

### B — Deuxième projet Supabase dédié dev/preview (= R11) — **cible recommandée**

Un projet distinct `phil-dev`, et des **clés par environnement Vercel** :

| Environnement Vercel | Projet Supabase |
|---|---|
| Development / Preview | `phil-dev` |
| **Production** | `phil` (isolé) |

- **Pour** : la prod (et ses pièces d'identité) est **isolée** ; les previews de
  branches travaillent sur des données jetables ; **débloque PHIL-R17** (le job CI
  `rls` a besoin d'une base de test dédiée + secrets). C'est l'approche standard
  pour un déploiement Vercel multi-environnements.
- **Contre** : un 2ᵉ projet à gérer (le free tier Supabase autorise 2 projets
  actifs) ; il faut y appliquer les migrations et poser les bonnes clés par env.
- **Flux** : `db:push` d'abord sur `phil-dev` (validation + `verify:rls`), puis sur
  `phil` (prod) une fois la migration éprouvée.

### C — Statu quo discipliné

Garder une seule base, avec des garde-fous (voir §En attendant). Acceptable tant
que la prod ne contient pas de données réelles — à ne **pas** conserver au-delà.

## Recommandation

1. **Court terme, sans rien provisionner** : utiliser la **stack locale (A)** pour
   tout ce qui est destructif (tester une migration, un seed, un `db reset`).
2. **Cible** : **Option B / R11** — un projet `phil-dev` pour dev+preview, la prod
   isolée. C'est aussi le préalable à **R17** (CI RLS).
3. Les seeds (`seed-demo-*`) et `verify:rls` ne devraient tourner que contre une
   base **de dev/test**, jamais la prod.

Chaîne de tickets : **U05** (ce document, clarifie) → **R11** (provisionne la
séparation) → **R17** (active le job CI `rls` sur la base de test).

## En attendant la séparation — garde-fous

- **Ne jamais** lancer `supabase db reset` contre le projet lié `phil` (c'est la
  prod).
- Lancer les **seeds** en connaissance de cause (ils écrivent en prod aujourd'hui)
  et nettoyer les données de démo ensuite.
- Toute migration sensible : `pnpm db:dump` **avant** (cf. `docs/BACKUP.md`), puis
  `pnpm verify:rls` **après**.
- Ne jamais exposer le `service_role` d'aucun projet (cf. `docs/INCIDENT.md`).

---

Voir aussi : `CLAUDE.md` (stack et conventions migrations), `docs/BACKUP.md`
(sauvegarde avant migration), `TODO.md` (tickets R11, R17).
