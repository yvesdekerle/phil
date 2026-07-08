# Sauvegarde & restauration (PHIL-J07)

Runbook de sauvegarde/restauration de Phil. Cible : projet perso, **Supabase Free
tier**, cercle d'amis. Rien d'exotique — juste ce qu'il faut pour ne pas perdre
les voyages (et pouvoir dormir malgré les pièces d'identité dans le coffre).

## Ce qui compose l'état à sauvegarder

| Élément | Où | Sauvegardé par |
|---|---|---|
| **Schéma** (tables, RLS, triggers, fonctions) | `supabase/migrations/*.sql` | **Git** (déjà versionné) |
| **Données** (voyages, événements, idées, valise, dépenses, profils…) | Postgres Supabase | Backups Supabase + `pnpm db:dump` |
| **Fichiers du coffre** (documents d'identité) | Supabase Storage (bucket `documents`) | Manuel (voir plus bas) |
| **Couvertures / photos** | Supabase Storage (`covers`, `photos`) | Manuel |

> **Le schéma n'a pas besoin d'être sauvegardé séparément** : il est **entièrement
> décrit par les migrations** dans le repo. Une restauration = rejouer les
> migrations (schéma) **puis** recharger un dump de **données**.

## 1. Backups automatiques Supabase

Supabase effectue des **backups quotidiens** du Postgres. Sur le **Free tier** la
rétention est courte (**~7 jours**) et il n'y a **pas de PITR** (Point-in-Time
Recovery, réservé aux plans payants).

- **Consulter / restaurer** : Dashboard Supabase → projet `phil` → **Database →
  Backups**. Selon l'offre en cours, le bouton *Restore* peut nécessiter un plan
  payant ; sinon, se rabattre sur le dump manuel (section 2).
- ⚠️ L'offre exacte du free tier évolue — **vérifie l'onglet Backups** de ton
  projet plutôt que de te fier à cette page.

Un projet Free est **mis en pause après 7 jours d'inactivité** : pense à le
réveiller (une requête suffit) avant qu'un backup n'expire.

## 2. Sauvegarde manuelle des données (gratuite, recommandée)

Le schéma étant dans Git, on ne dumpe que **les données** :

```bash
pnpm db:dump
# → écrit tmp/backup-AAAA-MM-JJ.sql (dossier tmp/ ignoré par Git)
```

Ce script lance `supabase db dump --linked --data-only`. Le fichier atterrit dans
`tmp/` qui est **gitignoré** — c'est volontaire : **ne jamais committer un dump**,
il contient des données personnelles.

**À faire au minimum** :
- **avant toute migration sensible** (touchant aux données ou aux politiques RLS) ;
- **périodiquement** (mensuel suffit pour un cercle d'amis), en gardant le `.sql`
  **hors de la machine** (cloud perso chiffré, disque externe…).

> **Le coffre est chiffré de bout en bout** : dans le dump SQL, les colonnes du
> coffre (documents, `enc_document_number`…) sont **du chiffré inexploitable sans
> les clés des appareils** (cf. `docs/E2EE-COFFRE.md`). En revanche les voyages,
> événements, idées, profils, etc. sont **en clair** dans le dump → stocke-le de
> façon sûre (idéalement re-chiffré).

## 3. Fichiers Storage (hors backup DB)

Les backups Postgres **ne couvrent pas** Supabase Storage. Les buckets à part :

- `documents` — pièces du coffre (**fichiers chiffrés** : une copie brute est
  inutilisable sans les clés) ;
- `covers`, `photos` — images de voyage (**en clair**).

Sauvegarde manuelle : Dashboard → **Storage** → télécharger, ou script via l'API
Storage. Sur le free tier il n'y a **pas de backup automatique du Storage** — à
faire à la main si ces fichiers comptent.

## 4. Exports logiques (complément, pas un vrai backup)

Deux mécanismes applicatifs donnent des exports lisibles, utiles en dépannage :

- **Export RGPD** (`/api/export`, PHIL-C07) — JSON de tes données perso (profil,
  voyages, événements/idées créés, métadonnées documents, journal d'audit).
- **Export d'un voyage** (PHIL-Q19) — Réglages du voyage → *Exporter (JSON)* : le
  **squelette réimportable** d'un voyage (événements, idées, valise, candidats).
  Idéal pour dupliquer ou re-créer un voyage, pas pour restaurer toute la base.

## 5. Restauration

1. **Schéma** — repartir d'une base propre et rejouer les migrations :
   ```bash
   pnpm db:push          # applique supabase/migrations/ sur la base liée
   ```
   (En local : `pnpm exec supabase db reset` recrée tout depuis les migrations.)
2. **Données** — recharger un dump de données :
   ```bash
   psql "$SUPABASE_DB_URL" -f tmp/backup-AAAA-MM-JJ.sql
   ```
   `SUPABASE_DB_URL` = chaîne de connexion Postgres (Dashboard → Database →
   Connection string). ⚠️ **La restauration écrase** — tester d'abord en local ou
   sur un projet jetable.
3. **Après restauration** :
   ```bash
   pnpm db:types         # régénère types/database.ts
   pnpm verify:rls       # revalide les politiques d'accès
   ```
4. **Storage** — re-téléverser les fichiers sauvegardés dans leurs buckets si
   nécessaire.

## 6. Routine conseillée

- **Quotidien** : on s'appuie sur les backups auto Supabase (rétention ~7 j).
- **Avant migration sensible** : `pnpm db:dump` → garder le `.sql` hors machine.
- **Mensuel** : `pnpm db:dump` + export manuel du Storage si le coffre a bougé.
- **Différé (optionnel)** : cron hebdomadaire (GitHub Actions) qui lance
  `supabase db dump` et pousse un artefact **chiffré** vers un stockage tiers —
  non mis en place en v1 (voir Backlog TODO). Nécessiterait un secret CI avec la
  chaîne de connexion, à protéger comme le `service_role`.

---

Voir aussi : `docs/INCIDENT.md` (réponse à incident), `docs/E2EE-COFFRE.md`
(pourquoi un dump du coffre est inexploitable).
