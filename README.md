# Phil — carnet de voyage entre amis

Application web de carnet de voyage collaboratif avec coffre-fort d'identité
personnel. Un petit groupe d'amis planifie un voyage ensemble (événements,
documents, idées, dépenses partagées) et chacun garde ses pièces d'identité
réutilisables dans un coffre privé et sécurisé.

> Le nom vient de **Phileas Fogg** (*Le Tour du monde en 80 jours*) : méthodique,
> obsédé par les horaires — comme l'app avec son calendrier planifié à la minute.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind + shadcn/ui · Supabase
(Postgres + RLS, Auth Google, Storage) · WebAuthn (coffre) · Serwist + Dexie
(offline PWA) · Resend (emails) · Vercel (hébergement).

## Démarrer

Prérequis : Node 24 (voir `.nvmrc`), `pnpm`, un projet Supabase.

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les variables (voir CLAUDE.md)
pnpm dev                     # http://localhost:3000
```

Variables d'environnement requises : `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (serveur only),
`NEXT_PUBLIC_APP_URL`. Optionnelles : Resend, VAPID (push), Gemini (import
email), Upstash (rate limiting). Détail complet dans `CLAUDE.md`.

## Commandes

```bash
pnpm dev            # serveur de dev (Turbopack)
pnpm build          # build de production
pnpm lint           # Biome (lint + format check)
pnpm type-check     # tsc --noEmit
pnpm test           # tests unitaires (Vitest)
pnpm test:e2e       # tests e2e (Playwright)
pnpm verify:rls     # vérification des politiques RLS (après migration sensible)
pnpm db:push        # applique les migrations Supabase
pnpm db:types       # régénère types/database.ts depuis le schéma distant
```

## Sécurité

L'accès aux données est porté par les **politiques RLS Postgres**
(`supabase/migrations/`), pas par le code applicatif. Toute migration touchant
les politiques doit être suivie de `pnpm verify:rls`. Le coffre ajoute WebAuthn,
filigrane dynamique et journal d'audit. Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`
côté client ni préfixer un secret par `NEXT_PUBLIC_`.

## Aller plus loin

- **`CLAUDE.md`** — contexte projet complet (modèle de données, règles de
  partage, conventions, choix techniques).
- **`TODO.md`** — roadmap et historique des tickets (source de vérité de l'avancement).
- **`docs/FONCTIONNALITES.md`** — catalogue des fonctionnalités par catégorie.
