# CLAUDE.md — Phil

Ce fichier fournit le contexte projet à Claude Code (et autres outils LLM) pour qu'ils puissent contribuer efficacement au projet.

## Origine du nom

**Phil** est un diminutif affectueux de **Phileas Fogg**, le héros du *Tour du monde en 80 jours* de Jules Verne. Le choix n'est pas anodin : Phileas Fogg est un voyageur méthodique et obsédé par la précision des horaires — exactement ce que fait l'application avec son calendrier d'événements et ses transports planifiés à la minute. Le diminutif "Phil" rend le tout chaleureux et amical, comme un compagnon de voyage sympathique plutôt qu'un outil froid.

Le ton général du produit doit refléter cet esprit : organisé sans être rigide, élégant sans être pompeux, et complice avec l'utilisateur. Quelques clins d'œil discrets au roman de Verne sont les bienvenus dans la microcopy (messages de chargement, états vides, emails) — sans jamais alourdir l'expérience.

## Vue d'ensemble du projet

**Phil** est une application web de carnet de voyage collaboratif avec coffre-fort d'identité personnel. Elle permet à un petit groupe d'amis d'organiser des voyages ensemble : planification d'événements (transports, hébergements, activités), partage de documents (billets, vouchers, forfaits), gestion d'idées d'activités non planifiées, et stockage sécurisé de documents d'identité réutilisables (passeport, CNI, permis).

**Cible** : usage personnel + cercle d'amis restreint (~10-20 utilisateurs max). Pas un produit grand public.

**Principes clés** :
- **Coffre privé par défaut** : les documents d'identité sont privés, partagés explicitement vers un voyage si besoin.
- **Voyage public-aux-membres par défaut** : les documents d'un voyage sont visibles de tous les participants sans action explicite.
- **Sécurité forte sur le coffre** : chiffrement, filigrane dynamique, audit log, déverrouillage biométrique.
- **Offline lecture** : consultation des données voyage et documents marqués offline même sans réseau.
- **Coût zéro en v1** : tous les services utilisés sont en free tier.

## Workflow de développement avec Claude Code

Le développement suit un cycle strict par ticket, piloté par `TODO.md` (source de vérité de l'avancement). Le prompt de session complet est dans `PROMPT.md`. L'essentiel :

1. Reprendre le ticket `[~]` en cours s'il existe, sinon le premier `[ ]` dans l'ordre des phases (les tickets hors phases attendent la fin de projet ou une demande explicite)
2. Marquer `[~]`, annoncer le plan avant de coder, implémenter
3. `pnpm build` + `pnpm lint` (Biome) doivent passer avant toute suite
4. Marquer `[x]` avec la date + note éventuelle dans TODO.md
5. **Un commit par ticket** (TODO.md inclus dans le commit) : `feat(scope): description (PHIL-XXX)`
6. Les travaux découverts en cours de route deviennent de **nouveaux tickets** dans TODO.md, jamais du code non tracé

## Stack technique

| Couche | Techno | Rôle |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict | Frontend React + backend API dans un seul projet |
| Styling | Tailwind CSS + shadcn/ui | Design system rapide et cohérent |
| Hébergement | Vercel (plan Hobby) | Déploiement, HTTPS, preview branches |
| Base de données | Supabase Postgres | Données relationnelles avec Row Level Security |
| Authentification | Supabase Auth (provider Google) | SSO Google clé en main |
| Stockage fichiers | Supabase Storage | Documents PDF / images |
| Permissions | Row Level Security Postgres | Logique d'accès directement en base |
| Biométrie | WebAuthn / Passkeys | Face ID / Touch ID pour le coffre |
| PDF / filigrane | pdf-lib | Filigrane dynamique côté serveur |
| Email | Resend + React Email | Invitations, alertes |
| PWA / offline | Serwist | Service worker, cache |
| Cache local | Dexie.js (IndexedDB) | Stockage offline des données voyage |
| Validation | Zod | Validation entrées API et formulaires |
| Formulaires | React Hook Form + Zod | Gestion des formulaires |
| Dates | date-fns + date-fns-tz | Manipulations et fuseaux horaires |
| Vérification RLS | Script manuel (SQL ou tsx) | Sécurité des politiques d'accès, sans CI |

**En place** : CI GitHub Actions (`.github/workflows/ci.yml` — lint/type-check/build/tests + Dependabot), tests Vitest (unitaires) + Playwright (e2e surfaces non authentifiées), script `verify-rls`.
**Différé volontairement (voir Backlog dans TODO.md)** : Sentry (les logs Vercel + le logger structuré `lib/observability/logger.ts` suffisent pour un cercle d'amis) ; base Supabase de test dédiée (le job CI `rls` s'active dès que ses secrets sont fournis).

## Pourquoi ces choix

**Next.js monolithique plutôt que front/back séparés** : pour un projet personnel, séparer un backend Spring Boot d'un frontend React doublerait l'effort. Next.js permet d'avoir tout dans un seul projet, déployé en une commande sur Vercel.

**Supabase plutôt que Neon + Auth.js + R2** : Supabase regroupe Postgres, auth Google, storage et RLS dans un seul service free tier. Une seule intégration au lieu de trois.

**Row Level Security plutôt que contrôles applicatifs** : les règles d'accès sont définies dans Postgres et s'appliquent à toute requête, peu importe l'API. Impossible de fuiter par oubli côté code. Critique pour un projet manipulant des documents d'identité.

**WebAuthn plutôt qu'un PIN** : la clé privée ne quitte jamais l'appareil, plus sûr qu'un PIN, gratuit, natif au navigateur, déclenche Face ID/Touch ID automatiquement.

**Vercel + domaine `.vercel.app`** : HTTPS gratuit (requis pour WebAuthn), déploiement par git push, free tier suffisant. Domaine perso ajoutable plus tard sans rien casser. URL prévue : `phil.vercel.app` (ou variante si déjà prise, par exemple `phil-app.vercel.app`, `getphil.vercel.app`, `heyphil.vercel.app`).

**CI présente, pas de Sentry en v1** : une CI GitHub Actions (lint Biome, type-check, build, tests) tourne à chaque push, en complément du build/preview Vercel par branche. Sentry reste différé : les logs Vercel et le logger structuré suffisent pour un cercle d'amis ; il sera ajouté quand un second contributeur arrive ou que le volume le justifie.

## Identité visuelle et ton

**Nom du repo GitHub suggéré** : `phil` ou `phil-app`

**Pistes de branding** (à affiner avec le design) :
- Avatar / mascotte inspirée de Phileas Fogg : silhouette stylisée avec chapeau haut-de-forme, monocle ou gilet
- Logo alternatif : un globe avec une trajectoire de voyage qui forme un "P"
- Palette : tons chauds et nobles (bordeaux profond, beige parchemin, bleu nuit) plutôt que la palette tech bleu-blanc générique
- Typographie : un serif élégant pour les titres (rappel du XIXe siècle) + sans-serif moderne pour le corps
- Clins d'œil discrets au roman dans les états vides : "Phil n'a encore aucun voyage en tête... 80 jours, ça commence par un premier pas", "Aucun événement aujourd'hui — même Phileas prenait des pauses"

**Ton de la microcopy** :
- Tutoiement, chaleureux, complice
- Référence au voyage et à l'aventure sans être pompeux
- Phil parle parfois de lui à la première personne (états de chargement, notifications) : "Je prépare ton voyage...", "J'ai bien rangé ton document dans ton coffre"
- Éviter le jargon technique côté utilisateur

## Modèle de données (résumé)

Tables principales :
- `profiles` — extension de `auth.users` avec préférences
- `trips` — voyages, créés par un OWNER
- `trip_participants` — appartenance à un voyage avec rôle (OWNER/EDITOR/VIEWER)
- `trip_invitations` — invitations par email avec token
- `documents` — fichiers avec scope `VAULT` (coffre privé) ou `TRIP` (partagé voyage)
- `document_shares` — partage explicite d'un doc du coffre vers un voyage
- `trip_events` — événements du calendrier (TRANSPORT / LODGING / ACTIVITY)
- `event_documents` — liaison événement ↔ document
- `trip_ideas` — idées d'activités non planifiées
- `vault_access_log` — audit des accès au coffre
- `user_passkeys` — credentials WebAuthn enregistrés

## Règles de partage critiques

Ces règles sont implémentées en Row Level Security et **doivent** être vérifiées exhaustivement (script de vérification RLS, ticket PHIL-B12) :

1. Un document `scope=VAULT` est visible **uniquement** par son propriétaire, sauf s'il existe une ligne `document_shares` pour un voyage dont le visiteur est participant.
2. Un document `scope=TRIP` est visible par **tous** les participants du voyage référencé.
3. Un voyage est visible **uniquement** par les users présents dans `trip_participants`.
4. Modification : OWNER ou EDITOR du voyage. Suppression de voyage : OWNER uniquement.
5. Modification ou suppression d'un document : son propriétaire uniquement (sauf documents `scope=TRIP` que les OWNER du voyage peuvent aussi supprimer).

## Conventions de code

**Structure de dossiers** :
```
app/                    # Routes Next.js App Router
  (auth)/               # Pages publiques (login, callback)
  (app)/                # Pages authentifiées
    trips/              # Gestion des voyages
    vault/              # Coffre personnel
    profile/            # Profil et paramètres
  api/                  # API routes
components/             # Composants React partagés
  ui/                   # shadcn/ui components
  trips/
  vault/
  calendar/
lib/                    # Logique métier et helpers
  supabase/             # Clients et helpers Supabase
  auth/                 # Helpers d'authentification
  encryption/           # Chiffrement et filigrane
  offline/              # Cache et sync offline
scripts/                # Scripts utilitaires (vérification RLS, etc.)
types/                  # Types TypeScript globaux
supabase/               # Config Supabase CLI
  migrations/           # SQL versionné
```

**TypeScript** : mode strict activé, pas de `any` sauf cas exceptionnel justifié en commentaire. Préférer les types inférés depuis Zod schemas.

**Nommage** :
- Composants React en `PascalCase` (`TripCard.tsx`)
- Helpers et hooks en `camelCase` (`useCurrentUser.ts`)
- Routes API en `kebab-case` (`/api/trip-invitations`)
- Variables d'environnement en `SCREAMING_SNAKE_CASE`
- Tables Postgres en `snake_case` au pluriel (`trip_events`)
- Colonnes en `snake_case`

**Sécurité** :
- Jamais de service role key Supabase côté client
- Jamais de variable secrète préfixée `NEXT_PUBLIC_`
- Toute entrée utilisateur validée par Zod avant traitement
- Toute opération sur le coffre passe par un endpoint qui logge dans `vault_access_log`
- Pas d'URL signée long-lived pour les documents : toujours via API authentifiée
- Toute table exposée a ses politiques RLS actives avant utilisation côté front

**Fuseaux horaires** :
- Tous les `*_at` stockés en UTC (`timestamptz` Postgres)
- Champ `timezone` IANA obligatoire pour les événements
- Affichage via `date-fns-tz` avec mention explicite du timezone
- Le timezone par défaut d'un voyage est celui de la destination

**Migrations** :
- Toute modification de schéma passe par une nouvelle migration SQL dans `supabase/migrations/`
- Pas de modification via le dashboard Supabase en dehors du dev local
- Les migrations sont commitées et appliquées via le CLI Supabase

**Vérification de sécurité (sans CI en v1)** :
- Script `scripts/verify-rls.ts` (ou SQL) exécutable manuellement : simule plusieurs users et vérifie les règles de partage critiques
- À lancer obligatoirement après toute migration touchant aux politiques RLS, et avant tout déploiement d'une évolution du modèle documents/partage
- `npm audit` à lancer régulièrement en local ; Dependabot activé sur GitHub (natif, sans CI)

## Variables d'environnement

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server only, jamais exposé au client

# Auth
NEXT_PUBLIC_APP_URL=                # https://phil.vercel.app
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=                  # ex: phil@phil.app ou onboarding@resend.dev en dev

# Rate limiting (optionnel)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Free tiers à respecter

- **Vercel Hobby** : 100 Go bande passante/mois, fonctions max 10s, 2 cron jobs
- **Supabase Free** : 500 Mo base, 1 Go storage, projet pause après 7 jours d'inactivité
- **Resend Free** : 3000 emails/mois, 100/jour, domaine vérifié obligatoire pour envoi externe
- **Upstash Redis** (si utilisé) : 10k commandes/jour

## Workflow Git

- Branche `main` = production, déployée automatiquement par Vercel
- Branche `develop` = intégration, preview Vercel automatique
- Features sur `feature/PHIL-XXX-description-courte`
- Un commit par ticket, TODO.md mis à jour dans le même commit
- Format conventional commits : `feat(scope): description (PHIL-XXX)`, `fix(scope): description (PHIL-XXX)`, `chore: description`

## Commandes utiles

Le projet utilise **pnpm** (voir `packageManager` dans `package.json`) et **Biome**
(lint + format) — pas npm/ESLint/Prettier.

```bash
# Dev local
pnpm dev

# Build (obligatoire avant chaque commit de ticket)
pnpm build

# Lint (Biome) et type-check (obligatoire avant chaque commit de ticket)
pnpm lint
pnpm type-check

# Tests
pnpm test          # unitaires (Vitest)
pnpm test:e2e      # e2e (Playwright, surfaces non authentifiées)

# Vérification RLS (après toute migration touchant aux politiques)
pnpm verify:rls

# Migrations Supabase
pnpm exec supabase migration new <nom>
pnpm db:push
pnpm exec supabase db reset   # Local seulement

# Génération des types depuis le schéma (projet distant linké, pas de stack locale)
pnpm db:types
```

## Ressources

- Roadmap et tickets : voir `TODO.md`
- Prompt de développement : voir `PROMPT.md`
- Documentation Supabase : https://supabase.com/docs
- Documentation Next.js : https://nextjs.org/docs
- WebAuthn guide : https://webauthn.guide/
- pdf-lib : https://pdf-lib.js.org/
- Le Tour du monde en 80 jours (pour l'inspiration) : https://fr.wikipedia.org/wiki/Le_Tour_du_monde_en_quatre-vingts_jours
