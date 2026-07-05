# TODO — Phil

Roadmap détaillée du projet, organisée par catégorie. Chaque ticket a un ID stable utilisable comme clé de tracking. **Ce fichier est la source de vérité de l'avancement** : il est mis à jour à chaque ticket, dans le même commit que le code.

## Conventions de mise à jour

- `[ ]` à faire — `[~]` en cours — `[x]` terminé
- Un ticket terminé reçoit la date : `### [x] PHIL-A01 — ... *(fait le 2026-07-05)*`
- Si des choix notables ont été faits (lib retenue, écart avec la description, dette laissée), ajouter une ligne de note sous le ticket : `> Note : ...`
- Un travail découvert en cours de route devient un **nouveau ticket** dans la catégorie appropriée, avec le prochain ID libre (ex : PHIL-E09). Jamais de code non tracé.
- Un ticket trop gros peut être découpé en sous-tickets : PHIL-XXXa, PHIL-XXXb.
- Les tickets **non listés dans une phase** (ex : F02, F03, G04, H05, J02, J07, J08, catégorie L) sont à traiter en fin de projet ou à la demande.
- Il ne doit jamais rester de `[~]` orphelin en fin de session.

---

## Phases de réalisation

| Phase | Contenu | Tickets | Durée | Dates visées |
|-------|---------|---------|-------|--------------|
| **1 — Bootstrap** | Next.js 16, Vercel, Supabase, Auth Google | ~~A01~~ → A02 → A03 → A04 → A05 → C01 → C02 → C03 | ~1.5 sem. | 6 juil → 15 juil |
| **2 — Données et voyages** | Schémas DB, RLS, CRUD voyages | B01 → B02 → B09 → B13 → D01 → D02 → D03 → D04 → B05 → B11 | ~2 sem. | 16 juil → 29 juil |
| **3 — Coffre (dépôt + consultation)** | Documents, upload, viewer simple, audit log | B03 → B04 → B07 → B10 → B12 → E01 → E02 → E03a → E04 | ~2 sem. | 30 juil → 12 août |
| **4 — Calendrier** | Événements, transport, lodging, timezones | F01 → F04 → F05 → F06 → F07 → F08 → F09 → F10 | ~2 sem. | 13 août → 26 août |
| **5 — Partage docs voyage** | Documents partagés, viewer voyage | G01 → G02 → G03 → E05 | ~1 sem. | 27 août → 2 sept |
| **6 — Idées** | Pool d'idées, votes, conversion → événement | B06 → H01 → H02 → H03 → H04 | ~1 sem. | 3 sept → 9 sept |
| **7 — Invitations** | Emails Resend, acceptation, gestion participants | B08 → D05 → D06 → D07 → K01 → K02 | ~1.5 sem. | 10 sept → 20 sept |
| **8 — Offline** | PWA, IndexedDB, sync | I01 → I02 → I03 → I05 → I04 → I06 | ~1.5 sem. | 21 sept → 30 sept |
| **9 — Sécurisation coffre** | WebAuthn, filigrane PDF, durcissement viewer | C04 → C05 → E06 → E03b → E08 | ~1.5 sem. | 1 oct → 11 oct |
| **10 — Polish, sécurité, RGPD** | Headers sécu, Zod, RGPD, alertes, carnet d'amis | J01 → J03 → J04 → J05 → C06 → C07 → E07 → K03 → K04 → D08 | ~1.5 sem. | 12 oct → 23 oct |
| **Buffer** | Imprévus + tests réels avec le groupe Maurice | | ~1.5 sem. | 24 oct → 4 nov |
| 🇲🇺 | **Voyage Maurice (9 personnes)** | | | **5 nov → 21 nov** |

**Objectif clé** : phases 1 → 7 = minimum vital pour Maurice. À 9 participants, le collaboratif (invitations, documents partagés, idées votées) est le cœur du besoin. Les phases 8 (offline sur place) et 9 (coffre sécurisé pour les passeports — voyage international) sont fortement souhaitées avant le départ ; le buffer les protège.

**Second jalon** : Serre-Chevalier janvier 2027 (11 personnes, forfaits de ski) pour éprouver ce qui n'aura pas servi à Maurice.

**Estimation totale** : ~16 semaines (soir et weekends), buffer inclus. Fin visée : fin octobre 2026.

---

## Catégorie A — Fondations & infrastructure

### [x] PHIL-A01 — Bootstrap projet Next.js
Initialiser un projet Next.js 16 avec App Router, TypeScript en mode strict, Tailwind CSS, ESLint, et Prettier. Configurer la structure de dossiers : `app/` pour les routes, `components/` pour les composants partagés, `lib/` pour la logique métier, `db/` pour les schémas et migrations, `types/` pour les types TypeScript globaux. Initialiser un repo Git, créer une branche `main` et `develop`. Configurer Biome ou ESLint+Prettier pour le formatage automatique au commit (lefthook ou husky).

### [x] PHIL-A02 — Création projet Vercel et premier déploiement *(fait le 2026-07-02)*
Créer un compte Vercel, lier le repo GitHub, déployer une page d'accueil minimale pour valider l'URL `phil.vercel.app` (ou variante si déjà prise). Configurer les environnements (production sur main, preview sur les autres branches). Vérifier que HTTPS fonctionne et que l'URL est stable.
> Note : `phil.vercel.app` était pris — URL de production : `https://phil-phi-nine.vercel.app` (alias auto-assigné, une variante type `phil-app.vercel.app` reste possible plus tard via `vercel domains add`). Repo GitHub `yvesdekerle/phil` poussé (main + develop) et connecté à Vercel : production sur `main`, preview sur les autres branches. Premier déploiement vérifié en HTTPS.

### [x] PHIL-A03 — Création projet Supabase *(fait le 2026-07-02)*
Créer un compte Supabase, créer un projet en région européenne (Frankfurt ou Paris), récupérer les clés API (anon key publique et service role key privée). Stocker les clés dans les variables d'environnement Vercel (jamais en dur dans le code). Tester la connexion depuis Next.js avec une requête simple.
> Note : projet `phil` (ref `xinbuahgscaydpkcamsl`) créé via le dashboard en région **eu-west-1 Ireland** (écart : Frankfurt/Paris prévu — reste dans l'UE, RGPD OK). Postgres 17. Clés legacy anon/service_role utilisées (cohérence avec le nommage CLAUDE.md). Env vars posées sur les 3 environnements Vercel + `.env.local`. Clients `@supabase/ssr` dans `lib/supabase/` (client.ts / server.ts) et route de test `/api/health`. CLI `supabase` en devDependency.

### [x] PHIL-A04 — Setup Supabase Auth avec Google SSO *(fait le 2026-07-02)*
Activer le provider Google dans Supabase Auth. Créer un projet Google Cloud, configurer OAuth consent screen et identifiants OAuth 2.0, déclarer les redirect URIs (Supabase callback URL + URL Vercel). Implémenter les pages `/login` et `/auth/callback` côté Next.js. Vérifier qu'on peut se connecter et qu'un utilisateur est créé dans `auth.users` Supabase.
> Note : projet Google Cloud `Phil` (nouvelle UI Google Auth Platform), client OAuth web `phil-supabase`, consent screen External. Flow PKCE : `/login` (page client minimale, l'UI soignée arrive en C01) → Google → `{supabase}/auth/v1/callback` → `/auth/callback` (échange code/session) → `/`. Redirect URLs Supabase : localhost, prod, wildcard previews. Login vérifié en local, user créé dans `auth.users` (provider google). Page d'accueil affiche l'état de session.

### [x] PHIL-A05 — Setup variables d'environnement *(fait le 2026-07-03)*
Lister toutes les variables nécessaires : Supabase URL, Supabase anon key, Supabase service role key, Resend API key. Créer un fichier `.env.example` documenté. Configurer les variables dans Vercel pour les trois environnements (development, preview, production).
> Note : `.env.example` réécrit et documenté. Supabase (3 vars) sur les 3 envs Vercel ; `NEXT_PUBLIC_APP_URL` sur production + development seulement (les URLs preview varient par branche — à traiter si besoin en Phase 7 invitations). Resend différé à K01, Upstash à J02, Sentry retiré (backlog). Google OAuth vit dans Supabase, pas en env applicative.

---

## Catégorie B — Modèle de données & sécurité base

### [x] PHIL-B01 — Schéma table `profiles` *(fait le 2026-07-03)*
Table Supabase qui étend `auth.users` : `id` (UUID, FK vers auth.users), `display_name`, `avatar_url`, `locale`, `timezone`, `created_at`, `updated_at`. Trigger Postgres qui crée automatiquement un profil à chaque inscription. RLS : un user ne peut voir et modifier que son propre profil.
> Note : migration `20260703065147_profiles.sql` appliquée via `supabase link` + `db push` (le gros de B13 est de fait en place). Triggers : `handle_new_user` (security definer, création auto + reprise des métadonnées Google) et `set_updated_at`. Backfill du user existant depuis `user_metadata` (migration C03 → table). Page profil basculée sur la table (`lib/supabase/profiles.ts`, typage manuel en attendant `gen types` en B13). Vérifié : RLS anon → vide, lecture/écriture via l'UI OK.

### [x] PHIL-B02 — Schéma tables `trips` et `trip_participants` *(fait le 2026-07-03)*
Table `trips` : `id`, `name`, `destination`, `start_date`, `end_date`, `cover_image_url`, `default_timezone`, `created_by`, `created_at`, `archived_at`. Table `trip_participants` : `trip_id`, `user_id`, `role` (`OWNER` / `EDITOR` / `VIEWER`), `joined_at`, `invited_by`. Index sur `(user_id)` pour lister rapidement les voyages d'un user.
> Note : migration `20260703073542_trips.sql`. Enum `trip_role`, FK vers `profiles`, contrainte `end_date >= start_date`, PK composite `(trip_id, user_id)`. **RLS activée sans policies** (deny all) jusqu'à B09. Trigger `handle_new_trip` (security definer) : le créateur devient OWNER automatiquement — évite le problème d'œuf-et-poule des policies. Vérifié : trigger OWNER + cascade delete OK, anon bloqué.

### [x] PHIL-B03 — Schéma table `documents` *(fait le 2026-07-03)*
Table avec : `id`, `owner_id`, `scope` (`VAULT` ou `TRIP`), `trip_id` (nullable, requis si scope=TRIP), `file_name`, `mime_type`, `size_bytes`, `storage_path`, `category` (passport, id_card, driving_license, ticket, voucher, lodging, insurance, other), `expires_at` (nullable), `metadata` (JSONB pour champs spécifiques type numéro de passeport), `uploaded_at`, `deleted_at`. Index sur `(owner_id, scope)` et `(trip_id)`.
> Note : migration `20260703084613_documents.sql`. Contrainte : `scope=TRIP` ⇒ `trip_id` requis, `scope=VAULT` ⇒ `trip_id` null (partage via `document_shares` uniquement) — vérifiée en base. `storage_path` unique, cascade trip/owner. **FK `event_documents.document_id` posée** (dette B05 soldée). RLS deny all jusqu'à B10. Bucket Storage : à créer en E02. Types régénérés.

### [x] PHIL-B04 — Schéma table `document_shares` *(fait le 2026-07-03)*
Table de liaison : `id`, `document_id`, `trip_id`, `shared_at`, `shared_by`. Permet à un user de partager explicitement un document de son coffre vers un voyage donné. Contrainte unique sur `(document_id, trip_id)`.
> Note : migration `20260703084814_document_shares.sql`. Cascade sur document et trip (retirer l'un retire le partage), index `trip_id`, RLS deny all jusqu'à B10. Types régénérés.

### [x] PHIL-B05 — Schéma tables `trip_events` et `event_documents` *(fait le 2026-07-03)*
Table `trip_events` : `id`, `trip_id`, `type` (`TRANSPORT` / `LODGING` / `ACTIVITY`), `title`, `starts_at` (UTC), `ends_at` (UTC), `timezone` (IANA), `location_name`, `location_address`, `location_lat`, `location_lng`, `notes`, `metadata` (JSONB pour champs spécifiques par type), `created_by`, `created_at`. Table `event_documents` : `event_id`, `document_id`. Index sur `(trip_id, starts_at)`.
> Note : migration `20260703083204_trip_events.sql`. Enum `event_type`, contrainte `ends_at >= starts_at` (nullable), cascade sur trips. **`event_documents.document_id` sans FK pour l'instant** : la table `documents` n'existe qu'en B03 — la migration B03 devra ajouter `alter table event_documents add constraint ... references documents(id) on delete cascade`. RLS activée sans policies jusqu'à B11. Types régénérés.

### [x] PHIL-B06 — Schéma table `trip_ideas` *(fait le 2026-07-03)*
Table : `id`, `trip_id`, `title`, `description`, `external_url`, `location_name`, `location_lat`, `location_lng`, `estimated_duration_minutes`, `estimated_cost`, `cost_currency`, `tags` (text array), `status` (`POOL` / `SCHEDULED` / `DISMISSED`), `scheduled_event_id` (nullable), `created_by`, `created_at`. Permet la conversion idée → événement.
> Note : migration `20260703104750_trip_ideas.sql`. Inclut les **policies RLS différées de B11** (select participant, insert/update OWNER-EDITOR + anti-usurpation, delete OWNER/créateur) et la table **`idea_votes`** découverte pour H03 (PK composite = 1 voix max, vote ouvert à tout participant VIEWER compris, retrait de sa propre voix uniquement). Helper `private.idea_trip_id`. `scheduled_event_id` en on delete set null (l'idée survit à la suppression de l'événement). Types régénérés.

### [x] PHIL-B07 — Schéma table `vault_access_log` *(fait le 2026-07-03)*
Table d'audit : `id`, `document_id`, `accessed_by`, `action` (`VIEW` / `DOWNLOAD` / `SHARE` / `UNSHARE`), `accessed_at`, `ip_address`, `user_agent`. Toute opération sur un document du coffre y est tracée dès la Phase 3 (upload, consultation, modification, suppression). Pas de RLS pour modification, écriture uniquement via service role. La page de consultation du log (E08) arrive en Phase 9.
> Note : migration `20260703084956_vault_access_log.sql`. Enum élargi à 7 actions (UPLOAD/UPDATE/DELETE en plus, exigés par le texte du ticket). Deux ajouts au schéma prévu : `document_owner_id` **dénormalisé** (le propriétaire garde la trace même après suppression du doc, et la policy SELECT E08 s'en sert sans jointure) et `document_id` en **on delete set null** (l'audit survit au document). Écriture service role uniquement, immuable — vérifié (anon 401).

### [x] PHIL-B08 — Schéma table `trip_invitations` *(fait le 2026-07-03)*
Table : `id`, `trip_id`, `invited_email`, `invited_by`, `token` (UUID unique), `role`, `created_at`, `accepted_at`, `expires_at`. Permet d'inviter par email avec un lien magique avant que la personne n'ait un compte.
> Note : migration `20260703112724_trip_invitations.sql`. Expiration à 30 jours par défaut, contrainte unique `(trip_id, invited_email)`. RLS : select participant, insert/delete OWNER-EDITOR (règle 4) ; **pas d'UPDATE côté client** — l'acceptation (D06) résout le token via service role car l'invité n'est pas encore participant. Types régénérés.

### [x] PHIL-B09 — Politiques RLS sur `trips` et `trip_participants` *(fait le 2026-07-03)*
Activer RLS sur les deux tables. Politique `trips` : un user peut SELECT un voyage si et seulement s'il est dans `trip_participants` pour ce voyage. Politique INSERT : tout user authentifié peut créer un voyage. Politique UPDATE : seul OWNER et EDITOR peuvent modifier. Politique DELETE : seul OWNER. Politiques équivalentes sur `trip_participants`.
> Note : migration `20260703075238_rls_trips.sql`. Helpers `security definer` dans le schéma **`private`** (non exposé) pour éviter la récursion des policies : `is_trip_participant`, `trip_role`. `trip_participants` : insert/update = OWNER, delete = OWNER ou soi-même (quitter). Vérifié par script croisé à 2 users jetables : 12/12 OK. **⚠️ Pour D02** : l'INSERT d'un trip doit se faire avec un `id` généré côté client + `return=minimal` (le RETURNING évalue la policy SELECT avant le trigger AFTER qui crée la ligne participant), puis re-SELECT.

### [x] PHIL-B10 — Politiques RLS sur `documents` *(fait le 2026-07-03)*
Activer RLS. Politique SELECT : un user peut voir un document si (a) il en est propriétaire, OU (b) le document a `scope=TRIP` et l'user est participant du voyage, OU (c) le document a `scope=VAULT` et il existe une ligne dans `document_shares` pour un voyage dont l'user est participant. Politique INSERT : un user ne peut créer que ses propres documents. Politique UPDATE/DELETE : owner uniquement. C'est la politique la plus critique du projet, à vérifier exhaustivement.
> Note : migration `20260703085219_rls_documents.sql`. Couvre aussi les policies de `document_shares` (partage : propriétaire seul, doc VAULT seul, vers un voyage où il participe ; retrait : propriétaire seul). Helpers definer anti-récursion : `is_document_owner`, `document_is_vault`, `is_document_shared_with_user`. Delete étendu au trip-OWNER pour les docs TRIP (règle 5). Insert TRIP restreint à OWNER/EDITOR. Smoke test 10/10 (règles 1/2/5 + aller-retour partage) — vérification exhaustive committée en B12.

### [x] PHIL-B11 — Politiques RLS sur `trip_events`, `event_documents`, `trip_ideas` *(fait le 2026-07-03 — hors trip_ideas)*
Politique SELECT : participant du voyage. Politique INSERT/UPDATE : OWNER ou EDITOR. Politique DELETE : OWNER ou créateur de l'item.
> Note : migration `20260703083446_rls_trip_events.sql`. Couvre `trip_events` (+ anti-usurpation `created_by = auth.uid()` à l'insert) et `event_documents` (helper `private.event_trip_id`). **`trip_ideas` sera couverte par la migration B06** (la table n'existe pas encore — Phase 6). Vérifié par script croisé 2 users : 8/8 (étranger aveugle, VIEWER lecture seule, EDITOR crée et ne supprime que les siens).

### [x] PHIL-B12 — Script de vérification des politiques RLS *(fait le 2026-07-03)*
Script exécutable manuellement (`scripts/verify-rls.ts` via `npx tsx`, ou SQL) qui simule plusieurs users et vérifie qu'aucun ne peut accéder aux données des autres. Cas critiques : (1) user A ne voit pas le coffre de user B, (2) user A invité sur voyage X ne voit pas le voyage Y, (3) un document partagé via `document_shares` redevient invisible quand on retire le partage. À lancer obligatoirement après toute migration touchant aux politiques RLS et avant tout déploiement d'une évolution du modèle documents/partage. Pas de CI en v1 : la discipline d'exécution manuelle fait partie du workflow.
> Note : `scripts/verify-rls.ts` + script npm `verify:rls` (tsx en devDependency). **24 vérifications** en 3 sections (voyages B09, événements B11, documents B10), 2 users jetables auto-nettoyés, exit code 1 si échec. Les 3 cas critiques du ticket sont nommés explicitement dans la sortie. Lancé : 24/24.

### [x] PHIL-B13 — Setup migrations Supabase *(fait le 2026-07-03)*
Utiliser le CLI Supabase pour gérer les migrations en SQL versionné dans le repo (`supabase/migrations/`). Toute modification de schéma passe par une nouvelle migration commitée. Pas de modifications via le dashboard Supabase en dehors du dev local.
> Note : flow opérationnel depuis B01 (`supabase init` + `link` + `db push`, CLI en devDependency). Ce ticket ajoute : `types/database.ts` généré depuis le schéma distant (`--linked`, pas de stack Docker locale), clients Supabase typés `<Database>`, type `Profile` dérivé du schéma, scripts npm `db:push` et `db:types`, CLAUDE.md mis à jour. À chaque migration : `db push` puis `db:types`.

---

## Catégorie C — Authentification & gestion des comptes

### [x] PHIL-C01 — Page de login Google *(fait le 2026-07-03)*
UI minimale avec un bouton "Se connecter avec Google". Au clic, redirection vers OAuth Google via Supabase. Gestion du callback et redirection vers `/trips` après succès. Affichage d'une erreur claire en cas d'échec. Microcopy dans l'esprit Phil : "Bienvenue à bord" plutôt que "Login".
> Note : fondations d'identité visuelle posées dans ce ticket — palette Phil en tokens Tailwind (parchemin/papier/encre/bordeaux/laiton), typos **Bodoni Moda** (display, didone XIXe) + **Figtree** (corps) via next/font. Login = carte "billet d'embarquement" (encoches, filet perforé, itinéraire de Fogg). Redirection post-login vers `/trips` (page stub créée, la vraie arrive en D01). Erreur affichée via `?error=auth`. shadcn/ui sera initialisé au premier ticket à formulaires (C03).

### [x] PHIL-C02 — Middleware d'authentification Next.js *(fait le 2026-07-03)*
Middleware qui protège toutes les routes sauf `/`, `/login`, `/auth/*`, et les invitations publiques. Redirection vers `/login` si non authentifié. Récupération du user serveur-side via les helpers Supabase pour SSR.
> Note : Next 16 a renommé middleware en **`proxy.ts`** (export `proxy`, runtime nodejs) — c'est la convention utilisée. Helper `updateSession` dans `lib/supabase/middleware.ts` (pattern officiel @supabase/ssr : refresh session + protection). Publics : `/`, `/login`, `/auth/*`, `/invitations/*` (préparé pour D06), `/api/health`. Bonus : user connecté sur `/login` → redirigé `/trips`. Vérifié : /trips et /profile → 307 /login sans session, publics → 200.

### [x] PHIL-C03 — Page profil utilisateur *(fait le 2026-07-03)*
Vue du profil : nom, email, avatar, langue, timezone par défaut. Possibilité de modifier nom et préférences. Pas de modification d'email (lié au SSO Google). Bouton "Se déconnecter".
> Note : la table `profiles` n'existant qu'en B01, les préférences (display_name, locale, timezone) vivent pour l'instant dans `user_metadata` Supabase Auth — **B01 devra migrer ces valeurs vers `profiles`**. shadcn/ui initialisé (preset nova, base radix) avec tokens remappés sur la palette Phil ; composants button/input/label/select/card. Formulaire RHF + Zod + Server Action (validation Zod aussi côté serveur). Avatar Google via next/image (remotePatterns lh3.googleusercontent.com). Vérifié : enregistrement OK, métadonnées persistées.

### [x] PHIL-C04 — Enregistrement passkey WebAuthn *(fait le 2026-07-03)*
Page "Sécurité" avec bouton "Activer Face ID / Touch ID pour le coffre". Implémentation du flow WebAuthn registration : challenge serveur, création du credential côté client, stockage de la public key en base. Table `user_passkeys` : `id`, `user_id`, `credential_id`, `public_key`, `device_name`, `created_at`, `last_used_at`.
> Note : lib `@simplewebauthn` (server + browser — implémentation de référence du WebAuthn de la stack). Migration `20260703132903` avec `counter` (anti-clonage) et `transports` en plus du schéma prévu ; RLS select/delete own, insert via service role après vérification. Challenge en cookie httpOnly 5 min, `userVerification: required`, page `/security` liée au profil (liste + révocation). **Vérifié en réel avec Touch ID** (credential en base, transports hybrid+internal). NB process : les fichiers de ce ticket sont partis dans le commit du fix auth précédent — clôture ici.

### [x] PHIL-C05 — Authentification passkey à l'ouverture du coffre *(fait le 2026-07-03)*
À chaque accès à une page du coffre, déclencher un flow WebAuthn authentication. Si l'user n'a pas de passkey enregistrée, fallback sur une re-authentification Google. La validation passkey crée une session "vault unlocked" valide 15 minutes.
> Note : gate dans `app/(app)/vault/layout.tsx` — passkey présente + session absente → écran "Coffre verrouillé". Session = cookie httpOnly signé HMAC (secret dérivé de la service role key, 15 min), vérification à temps constant. Le déverrouillage met à jour `counter` (anti-clonage) et `last_used_at`. **Écart** : sans passkey, accès par la session standard + activation proposée sur /security (la re-auth Google du spec ajouterait une redirection complète pour une session que le proxy vient de valider). E03b étendra l'exigence de session au viewer. Vérifié en réel avec Touch ID.

### [x] PHIL-C06 — Suppression de compte (RGPD) *(fait le 2026-07-03)*
Bouton dans le profil "Supprimer mon compte". Confirmation forte. Job qui supprime : participants des voyages, documents (storage + base), idées créées, log d'audit. Pour les voyages dont l'user est OWNER unique : transfert au plus ancien EDITOR ou suppression du voyage si seul. Délai de grâce de 30 jours optionnel.
> Note : "Zone dangereuse" du profil, AlertDialog avec confirmation tapée (SUPPRIMER). `lib/account/deletion.ts` (service role) : docs+storage purgés, voyage solo supprimé, sinon transfert au plus ancien EDITOR (à défaut plus ancien participant) avec réassignation `created_by` (trips + events — FK RESTRICT, le programme appartient au groupe), idées et invitations créées supprimées, puis suppression auth (cascade profil/votes/passkeys/audit). **Écart** : pas de délai de grâce (optionnel au spec) — suppression immédiate, cercle d'amis. Testé en réel sur users jetables : les 7 vérifications passent (voyage solo disparu, successeur promu, event réassigné, blobs purgés, auth supprimé).

### [x] PHIL-C07 — Export de données personnelles (RGPD) *(fait le 2026-07-03)*
Endpoint qui génère un ZIP avec : profil, liste des voyages, événements créés, documents (en clair, déchiffrés), idées. Téléchargement unique avec lien expirant. Limite à un export par 24h pour éviter les abus.
> Note : `/api/export` (authentifié, lectures via RLS) → **JSON** téléchargé en direct : profil, voyages, participations, événements/idées créés, métadonnées documents, journal d'audit. Limite 1/24 h via `profiles.last_export_at` (429 sinon). **Écarts** : JSON direct plutôt que ZIP + lien expirant — embarquer les fichiers dépasserait les limites Vercel free (10 s / mémoire) ; ils restent téléchargeables individuellement, et le lien expirant n'a pas d'objet en téléchargement direct authentifié. Bouton "Exporter mes données" dans le profil. Vérifié en réel : export 200 complet puis 429.

---

## Catégorie D — Voyages & invitations

### [x] PHIL-D01 — Page liste des voyages *(fait le 2026-07-03)*
Vue principale après login. Cards par voyage avec : image de couverture, nom, destination, dates, nombre de participants, statut (à venir / en cours / passé / archivé). Tri chronologique avec les voyages en cours et à venir en premier. Bouton "Créer un voyage". État vide : "Phil est prêt à partir, où va-t-on ?"
> Note : helpers `lib/trips/status.ts` (statut + tri) et `format.ts` (plages de dates fr via date-fns). Cards avec placeholder monogramme laiton sur fond encre si pas de couverture ; badge statut ; voyages passés/archivés estompés. Layout `(app)` ajouté : header commun (wordmark → /trips, avatar → /profile). `next/image` ouvert aux couvertures HTTPS externes (wildcard). Le bouton "Créer un voyage" pointe vers `/trips/new` (D02, ticket suivant). Vérifié visuellement avec 3 voyages de test (3 statuts), données nettoyées.

### [x] PHIL-D02 — Création d'un voyage *(fait le 2026-07-03)*
Formulaire : nom, destination, dates de début et fin, image de couverture optionnelle (upload ou URL), timezone par défaut (auto-suggéré depuis la destination via une lib comme `tz-lookup`). Validation Zod. À la création, l'utilisateur devient automatiquement OWNER.
> Note : deux écarts. (1) Couverture par **URL https uniquement** — l'upload nécessite un bucket Storage, extrait en ticket **D09**. (2) Pas d'auto-suggestion `tz-lookup` : la lib attend lat/lng, pas un nom de ville — sans géocodage, select IANA avec défaut = timezone du profil (l'auto-suggestion viendra avec la carte v2 si besoin). Server Action avec Zod des deux côtés, UUID généré serveur + insert sans RETURNING (contrainte B09), OWNER via trigger B02. Vérifié en réel dans le navigateur (création + card + suppression de l'essai).

### [x] PHIL-D03 — Page détail voyage *(fait le 2026-07-03)*
Layout avec onglets : Calendrier (par défaut), Documents, Idées, Participants, Paramètres. Header avec image de couverture, dates, destination, et bouton de partage rapide.
> Note : layout `/trips/[tripId]` (RLS : non-participant → 404) avec header couverture/monogramme + badge statut + onglets. Calendrier/Documents/Idées/Paramètres = états vides Phil en attendant F01/G01/H01/D04. **Participants affiche déjà la liste réelle en lecture seule** (rôles francisés : Capitaine/Éditeur/Lecteur) — D07 ajoutera la gestion. Le bouton de partage rapide attend D05 (invitations). Embed PostgREST avec hint `!trip_participants_user_id_fkey` (deux FK vers profiles).

### [x] PHIL-D04 — Modification et archivage d'un voyage *(fait le 2026-07-03)*
Page paramètres du voyage : modifier nom, dates, destination, image, timezone. Bouton "Archiver" (visible uniquement OWNER) qui passe le voyage en archive sans le supprimer. Bouton "Supprimer" qui demande confirmation forte et purge tout (events, documents du voyage, idées, invitations).
> Note : onglet Paramètres complet. Édition = OWNER/EDITOR (RLS + message d'erreur si 0 ligne touchée) ; VIEWER voit le formulaire désactivé. "Zone du capitaine" (OWNER seulement) : Archiver/Désarchiver — restriction OWNER faite **côté applicatif** (la policy RLS UPDATE ne distingue pas les colonnes) — et Supprimer avec AlertDialog de confirmation forte. La purge couvre aujourd'hui les participants (cascade) ; les tables events/idées/documents/invitations devront porter `on delete cascade` à leur création (B05/B06/B03/B08). Vérifié en réel : renommage, archivage, suppression.

### [x] PHIL-D05 — Invitation par email *(fait le 2026-07-03)*
Sur la page Participants, formulaire pour inviter par email avec choix du rôle (EDITOR par défaut). Génération d'un token unique, création d'une ligne dans `trip_invitations`, envoi d'un email via Resend avec un lien `https://phil.vercel.app/invitations/{token}`.
> Note : formulaire OWNER/EDITOR (rôle EDITOR par défaut, OWNER non proposable), token généré en base, **lien copiable immédiatement** (secours WhatsApp tant que le domaine d'envoi n'est pas vérifié), liste des invitations en attente (non expirées) avec annulation. L'envoi de l'email est branché au ticket suivant (K02). Doublons bloqués par la contrainte unique.

### [x] PHIL-D06 — Acceptation d'invitation *(fait le 2026-07-03)*
Page `/invitations/{token}` qui affiche les infos du voyage et un bouton "Rejoindre". Si l'user n'est pas connecté, le rediriger vers login et revenir sur la page après. À l'acceptation, création de la ligne `trip_participants` et marquage de l'invitation comme acceptée. Gestion des invitations expirées (30 jours) ou déjà acceptées.
> Note : page carte "invitation au voyage" résolue via service role (invité hors RLS), états invalide/annulée/expirée/déjà utilisée. Login avec retour : `/login?next=…` (validation anti open-redirect) → `signInWithOAuth` → callback `?next=`. Acceptation : vérifs token puis insert participant (rôle de l'invitation) + `accepted_at` via service role ; participant existant → redirection directe. Pas de contrôle d'email : le lien EST la capacité (lien magique assumé, cercle d'amis). Vérifié : page, branche déjà-participant en réel, acceptation user B simulée → B voit le voyage via RLS.

### [x] PHIL-D07 — Gestion des participants *(fait le 2026-07-03)*
Liste des participants avec leur rôle. OWNER peut : changer le rôle de quelqu'un, retirer un participant, transférer la propriété (passer OWNER à quelqu'un d'autre, devenir EDITOR). Un user peut quitter un voyage de lui-même (sauf le dernier OWNER qui doit transférer avant).
> Note : sélecteur de rôle (Éditeur/Lecteur — passer OWNER = uniquement via "Passer capitaine"), transfert en deux updates ordonnés (promotion de l'autre PUIS rétrogradation, pour rester couvert par la policy OWNER), retrait avec confirmation, "Quitter le voyage" pour tous avec garde-fou dernier-capitaine (vérifié en réel). Vérifs applicatives doublées par la RLS B09.

### [x] PHIL-D08 — Carnet d'amis *(fait le 2026-07-03)*
Page qui liste les personnes avec qui l'user a déjà voyagé (extrait des `trip_participants`). Permet de les ré-inviter en un clic sur un nouveau voyage. Pas de social, juste un cache pratique.
> Note : page `/friends` (nav "Amis") — compagnons dédupliqués, tri par nombre de voyages partagés, ré-invitation : sélecteur (voyages OWNER/EDITOR) → invitation D05/K02 (rôle EDITOR, email en test → repli lien copiable sur Participants). **Bug majeur découvert et corrigé** : `profiles` n'était lisible que par soi-même (RLS `select_own` seule) → tous les noms de co-équipiers retombaient sur le fallback partout (participants, idées, "Ajouté par") — passé inaperçu car les tests E2E étaient mono-utilisateur. Migration `20260703170135` : policy `profiles_select_cotravelers` via `private.shares_trip_with()` (security definer). Effet de bord corrigé : `getOwnProfile` faisait `.single()` sans filtre. `verify:rls` repassé : 24/24. Vérifié en réel (Amelie, user démo, visible et ré-invitée).

### [x] PHIL-D09 — Upload d'image de couverture de voyage *(fait le 2026-07-03)*
Découvert en D02 (traité en URL seulement) : permettre l'upload d'une image de couverture vers un bucket Supabase Storage public-aux-membres (bucket dédié `covers`, policies RLS storage, redimensionnement/limite de taille). À traiter en Phase 5 avec les documents du voyage, ou à la demande.
> Note : bucket `covers` **lecture publique** (écart vs "public-aux-membres" : image non sensible, chemin `{trip_id}/{uuid}` non devinable — le privé aurait imposé URL signées ou endpoint, interdits/lourds pour une image de héros). Écriture/suppression réservées OWNER/EDITOR du voyage du préfixe (`private.trip_role`), 3 Mo max, JPG/PNG/WebP (limites aussi côté bucket). Upload direct navigateur + action `setCoverFromUpload` (chemin validé par regex, URL construite côté serveur). Pas de redimensionnement serveur (la limite 3 Mo suffit en v1). Vérifié : upload participant 200, voyage étranger 400, lecture publique 200.

---

## Catégorie E — Coffre personnel & documents

### [x] PHIL-E01 — Page coffre personnel *(fait le 2026-07-03)*
Liste des documents avec aperçu (icône par catégorie ou miniature pour les images), nom, catégorie, date d'upload, date d'expiration si applicable. Filtres par catégorie. Bouton "Ajouter un document". En Phase 3, l'accès est protégé par la session authentifiée standard ; le verrou WebAuthn (C05) s'ajoute par-dessus en Phase 9 sans changer cette page.
> Note : `/vault` avec filtres par catégorie en query param (pastilles), icônes lucide par catégorie (`components/vault/category-icon.tsx`, labels fr dans `lib/vault/categories.ts`), tri par date d'upload, soft-deleted exclus. Miniatures d'images : viendront avec le viewer E03a (pas d'URL publique possible sur un bucket privé — passera par l'endpoint authentifié). Nav "Voyages / Coffre" ajoutée au header d'app. Lignes cliquables vers `/vault/[id]` (page E03a/E04).

### [x] PHIL-E02 — Upload de document *(fait le 2026-07-03)*
Composant drag & drop ou file picker. Validation côté client : mime type autorisé (PDF, JPG, PNG, HEIC), taille max 10 Mo. Upload vers Supabase Storage dans un bucket privé. Insertion de la ligne dans `documents`. Saisie des métadonnées : catégorie, date d'expiration si pertinent, champs spécifiques (numéro de passeport pour un passeport, etc.).
> Note : bucket privé `documents` créé par migration (`20260703090211`, limite 10 Mo + mime types au niveau bucket). Policies storage : INSERT restreint au dossier `{uid}/…`, **aucune policy SELECT** — toute lecture passe par l'endpoint E03a (service role), rendant l'audit incontournable. Upload **direct client → Storage** (limite body 4,5 Mo des fonctions Vercel), puis Server Action : Zod, vérif du préfixe de chemin, insert `documents`, log `UPLOAD`, nettoyage du blob si l'insert échoue. Numéro de document → `metadata.document_number` (pièces d'identité). Client admin service-role dans `lib/supabase/admin.ts` + helper `logVaultAccess`. Vérifié en réel : upload UI → ligne + blob + audit.

### [x] PHIL-E03a — Visualisation simple d'un document *(fait le 2026-07-03)*
Endpoint API `/api/documents/{id}/view` qui : (1) vérifie que l'user a le droit (RLS), (2) récupère le fichier depuis Supabase Storage, (3) le streame avec `Content-Disposition: inline`. Affichage dans un viewer PDF côté client (PDF.js intégré ou iframe), images affichées directement. Chaque consultation d'un document `scope=VAULT` est logguée dans `vault_access_log` (action `VIEW`). Pas de filigrane ni de durcissement à ce stade : c'est l'objet de E03b et E06 en Phase 9. Ce viewer sert aussi aux documents du voyage (G03).
> Note : droit vérifié par la RLS (SELECT via client de session), blob via service role (seul chemin de lecture possible, bucket sans policy SELECT), `Cache-Control: private, no-store` déjà posé (E03b n'aura que filigrane + session vault à ajouter). Viewer : iframe native pour PDF (PDF.js écarté en v1 — l'iframe suffit), `img` pour images. Page `/vault/[id]` avec détails (n°, expiration, taille) — E04 y ajoutera Modifier/Supprimer. Vérifié : VIEW loggé, sans session → redirection login.

### [x] PHIL-E03b — Durcissement de la visualisation *(fait le 2026-07-03)*
Évolution du viewer E03a pour les documents `scope=VAULT` : application du filigrane dynamique via le service E06 sur chaque ouverture, headers `Cache-Control: private, no-store`, vérification systématique de la session "vault unlocked" (C05). Les documents `scope=TRIP` restent servis sans filigrane.
> Note : viewer durci pour VAULT — 403 "Coffre verrouillé" si passkey présente et session expirée, filigrane E06 à chaque ouverture (images JPG/PNG converties en PDF filigrané, extension .pdf ajoutée), HEIC servi tel quel (limitation E06), `no-store` déjà en place. Vérifié en réel : 403 avant Touch ID, puis PDF filigrané affiché et ligne VIEW dans `vault_access_log`. NB : TODO.md clôturé dans un commit séparé (édition ratée avant push).

### [x] PHIL-E04 — Suppression et modification de document *(fait le 2026-07-03)*
Sur un document, action "Modifier" (renommage, changement de catégorie, mise à jour métadonnées) et "Supprimer" (confirmation, suppression du blob storage et de la ligne en base, soft delete d'abord). Loggué dans `vault_access_log`.
> Note : édition inline (nom, catégorie, expiration, numéro) avec Zod + RLS owner. Suppression = **soft delete** (`deleted_at`, blob conservé) conformément au "soft delete d'abord" — la purge définitive blob+ligne viendra avec C06 ou un nettoyage périodique (à créer le moment venu). Actions logguées UPDATE/DELETE. Vérifié en réel : piste d'audit complète UPLOAD → VIEW → UPDATE → DELETE, deleted_at posé, blob conservé, doc absent de la liste et du viewer.

### [x] PHIL-E05 — Partage d'un document du coffre vers un voyage *(fait le 2026-07-03)*
Sur un document du coffre, bouton "Partager avec un voyage" qui ouvre une modale avec la liste de mes voyages actifs. Sélection du voyage → création d'une ligne `document_shares`. Le document devient visible des autres participants du voyage sans changer de scope. Affichage clair "Partagé avec : Voyage Mauritius nov 2026" sous le document. Possibilité de retirer le partage. Actions logguées (`SHARE` / `UNSHARE`).
> Note : section "Partages" sur `/vault/[id]` (`share-manager.tsx`) — modale des voyages actifs (non archivés, via RLS), état "Privé — toi seul…" sinon. La sécurité du partage est portée par la policy RLS B10 (propriétaire seul, doc VAULT seul, voyage où il participe). Actions SHARE/UNSHARE logguées. Vérifié en réel : partage → badge visible → retrait → audit UNSHARE, base nettoyée.

### [x] PHIL-E06 — Filigrane dynamique PDF *(fait le 2026-07-03)*
Service côté serveur qui prend un PDF en entrée et applique un filigrane diagonal avec : email du visualiseur, timestamp, et "Confidentiel - Ne pas diffuser". Implémenté avec pdf-lib. Pour les images (JPG/PNG), conversion en PDF d'abord puis filigrane. Performance cible : moins de 200ms par document.
> Note : `lib/vault/watermark.ts` — diagonales répétées couvrant toute la page (bordeaux, opacité 18 %), horodatage UTC. Perf mesurée : **52 ms** pour un PDF 3 pages, 5 ms pour une image (cible 200 ms large). **Limitation** : HEIC/HEIF non convertibles par pdf-lib → `canWatermark()` l'exclut, E03b servira ces fichiers tels quels (à réévaluer si besoin avec une conversion sharp côté serveur). Vérifié visuellement sur échantillon.

### [x] PHIL-E07 — Alerte expiration documents *(fait le 2026-07-03)*
Cron job (Vercel Cron, gratuit sur Hobby avec 2 jobs) qui scanne quotidiennement les `expires_at` et envoie un email Resend aux propriétaires à J-180, J-90, J-30 et J-7. Badge "Expire bientôt" affiché dans l'UI du coffre quand `expires_at < now + 90 jours`.
> Note : `vercel.json` cron 6 h UTC → `/api/cron/document-expiry` protégé par `CRON_SECRET` (généré, en `.env.local` ; **à pousser sur Vercel via `tmp/set-vercel-cron-secret.sh`**), route publique côté proxy (auto-protégée). Match exact `expires_at = today+N` pour N∈{180,90,30,7} → une alerte par seuil sans table d'état. Respecte `expiry_alerts` (K04). Badges coffre : "Expiré" (bordeaux) / "Expire bientôt" (< 90 j, laiton). Vérifié en réel : 401 sans secret, envoi J-30 reçu.

### [x] PHIL-E08 — Page audit log du coffre *(fait le 2026-07-03)*
Vue "Activité de mon coffre" qui affiche les dernières entrées de `vault_access_log` filtrées sur les documents de l'user. Permet de voir qui a consulté quoi et quand. Filtres par document, par action, par date. Le log est alimenté depuis la Phase 3 (B07) : la page révèle l'historique complet.
> Note : `/vault/activity` — donc derrière le verrou passkey du layout (vérifié : écran "Coffre verrouillé" avant Touch ID). Lecture RLS (`document_owner_id`), embed nom du document (« Document supprimé » si purgé — l'audit survit, FK set null) et auteur de l'accès, filtres par action / période (7 j, 30 j, tout) / document via l'URL, 200 dernières entrées. Vérifié en réel : historique complet de la journée affiché avec filtres.

### [x] PHIL-E09 — Partage ciblé d'un document du coffre *(demandé et fait le 2026-07-04)*
Aujourd'hui, partager un document du coffre vers un voyage le rend visible de **tout l'équipage** (règle critique n°1). Cas d'usage : à 9 sur Maurice, prêter son permis au seul conducteur — pas aux 8 autres. Permettre de choisir, au moment du partage, **"Tout l'équipage" (défaut) ou une/des personnes précises** du voyage.
- **Schéma** : colonne `shared_with uuid null references profiles` sur `document_shares` (NULL = tout le voyage, comportement actuel inchangé) ; contrainte d'unicité étendue `(document_id, trip_id, shared_with)`.
- **RLS** : mise à jour du helper `private.is_document_shared_with_user` — le partage vaut si `shared_with IS NULL` ou `shared_with = auth.uid()`. Le propriétaire garde la main (création/retrait).
- **UI** : dans "Partager avec un voyage" (fiche document du coffre), second sélecteur optionnel "Avec qui ?" (Tout l'équipage / participants cochables). Onglet Documents du voyage : badge "Partagé par X — pour toi" ; invisible pour les non-destinataires. Le document picker (F10, partage auto) reste en "tout l'équipage".
- **Audit** : le log `SHARE`/`UNSHARE` mentionne la cible.
- **Sécurité** : règle critique n°1 amendée dans CLAUDE.md + `verify-rls` étendu (3 vérifs : cible voit, autre participant ne voit pas, retrait ciblé n'affecte pas un partage équipage parallèle).
> Note : migration `20260704081553` — colonne `shared_with` (NULL = équipage), unicité `nulls not distinct`, helper `is_document_shared_with_user` et policy select des partages mis à jour (un participant ne voit pas les lignes ciblées vers d'autres). Dialogue de partage en 2 étapes (voyage → "Tout l'équipage" ou "Seulement X"), liste des partages avec audience et retrait par ligne, badge "— pour toi" sur l'onglet Documents. Le partage auto du document picker (F10) reste équipage entier et ignore les partages ciblés existants. **Écarts** : cible non tracée dans l'audit (pas de colonne détail dans vault_access_log, à ajouter si besoin) ; une seule personne par ligne (partager à 2 personnes = 2 partages). `verify-rls` : **30/30** dont 6 nouvelles vérifs E09.

---

## Catégorie F — Calendrier & événements de voyage

### [x] PHIL-F01 — Vue liste du calendrier *(fait le 2026-07-03)*
Vue par défaut sur mobile et probablement la plus utilisée. Événements groupés par jour, dans l'ordre chronologique. Affichage compact : heure, type (icône), titre, lieu. Tap sur un événement → page détail. Bandeau "Aujourd'hui" si on est dans la période du voyage.
> Note : `date-fns-tz` installé, helper central `formatInTimezone` posé dès maintenant dans `lib/events/datetime.ts` (F09 n'aura qu'à généraliser). Groupement par jour **dans le fuseau de chaque événement**, badge "Aujourd'hui" calculé dans le fuseau du voyage. Icônes lucide par type (avion/lit/boussole). Bouton "Ajouter" visible OWNER/EDITOR seulement, pointe vers `/events/new` (F04-F06). Vérifié en réel : conversion UTC→Maurice exacte, groupement 2 jours, badge Aujourd'hui.

### [x] PHIL-F02 — Vue jour du calendrier *(fait le 2026-07-03)*
Vue détaillée d'une journée avec une grille horaire. Affichage des événements positionnés sur leurs créneaux. Utile pour les journées chargées.
> Note : `/trips/[tripId]/day/[date]` — grille 6 h → minuit, événements positionnés en heure locale (couleur par type), multi-jours coupés à minuit, accessible en cliquant l'en-tête d'un jour du calendrier. Limitation v1 : les événements qui se chevauchent se superposent (pas de colonnes parallèles). Vérifié en réel sur le 5 nov de la démo.

### [x] PHIL-F03 — Vue timeline du voyage *(fait le 2026-07-03)*
Vue horizontale type Gantt qui montre la durée totale du voyage avec tous les événements. Surtout utile pour les transports et les hébergements qui couvrent plusieurs jours.
> Note : `/trips/[tripId]/timeline` (bouton "Timeline" sur le calendrier) — colonnes par jour (axe élargi aux événements qui débordent du voyage, ex. vol aller la veille), sections Transport/Hébergement/Activité, une ligne par événement, barres colorées cliquables, défilement horizontal. Vérifié en réel sur la démo Maurice (hébergements multi-jours parfaits).

### [x] PHIL-F04 — Création d'un événement TRANSPORT *(fait le 2026-07-03)*
Formulaire : type de transport (train, plane, bus, car, ferry, autre), titre auto-suggéré, gare/aéroport départ et arrivée, dates et heures (avec timezone), numéro de réservation, transporteur. Possibilité d'attacher un document immédiatement (upload ou pick depuis docs du voyage). Validation : `ends_at >= starts_at`.
> Note : page `/trips/[id]/events/new` avec sélecteur de type (pastilles) — LODGING/ACTIVITY en placeholder jusqu'à F05/F06. Titre auto-suggéré ("Avion Nice → Bastia") tant que non modifié. Heures saisies en local + fuseau → converties UTC via `fromZonedTime` côté serveur. `metadata` : transport_mode/from/to/booking_reference/carrier ; `location_name` = lieu de départ. **Deux écarts** : un seul fuseau par événement (celui du départ — vols transfrontaliers v2), attache de document renvoyée à F10 (picker réutilisable). Vérifié en réel : création + conversion Maurice OK.

### [x] PHIL-F05 — Création d'un événement LODGING *(fait le 2026-07-03)*
Formulaire : nom de l'hébergement, adresse, check-in date+heure, check-out date+heure, numéro de réservation, plateforme (Booking, Airbnb, autre), nombre de personnes, notes. Possibilité d'attacher un document.
> Note : check-in/check-out obligatoires (starts_at/ends_at), cohérence validée. `metadata` : platform (booking/airbnb/hotel/other), booking_reference, guests. `location_name` = nom, `location_address` = adresse. Attache de document : F10, comme F04.

### [x] PHIL-F06 — Création d'un événement ACTIVITY *(fait le 2026-07-03)*
Formulaire : titre, description, lieu, date+heure début, durée estimée, coût optionnel avec devise, lien externe. Possibilité d'attacher un document (e.g. ticket, voucher).
> Note : durée estimée → `ends_at` calculé (et `metadata.duration_minutes` conservé pour H04). Coût/devise (EUR par défaut) et lien externe dans `metadata`. Description → `notes`. Attache de document : F10. Ce formulaire servira de base pré-remplie à la conversion idée → événement (H04).

### [x] PHIL-F07 — Page détail événement *(fait le 2026-07-03)*
Affichage de toutes les infos saisies, des documents attachés (ouverture en un tap), bouton "Modifier" et "Supprimer" (selon rôle). Pour les transports, lien rapide "Itinéraire" qui ouvre Google Maps avec l'adresse de départ ou d'arrivée.
> Note : fiche complète par type (trajet, transporteur, plateforme, voyageurs, durée, coût, résa…), horaires "heure locale {fuseau}", documents attachés ouvrables via le viewer E03a, lien Itinéraire Google Maps (adresse > lieu > destination du trajet), lien externe pour les activités. Les boutons Modifier/Supprimer arrivent avec F08 (ticket suivant).

### [x] PHIL-F08 — Modification et suppression d'événement *(fait le 2026-07-03)*
Édition inline ou modale. Suppression avec confirmation. Loggé pour audit. Si l'événement avait des documents attachés, ils ne sont pas supprimés (juste la liaison `event_documents`).
> Note : page `/events/[id]/edit` pré-remplie en heure locale (champs communs : titre, horaires, fuseau, lieu, adresse, notes). **Écarts** : les métadonnées spécifiques par type (n° résa, trajet…) ne sont pas éditables en v1 (mention affichée) ; pas de table d'audit événements — trace `console.log` visible dans les logs Vercel. Boutons selon rôle : Modifier = OWNER/EDITOR, Supprimer = OWNER ou créateur (RLS + UI). Liaisons documents en cascade, documents intacts. Vérifié en réel : édition + suppression.

### [x] PHIL-F09 — Gestion des fuseaux horaires *(fait le 2026-07-03)*
Tous les `starts_at` / `ends_at` stockés en UTC. Le champ `timezone` IANA est obligatoire et pré-rempli avec le timezone par défaut du voyage. Affichage des heures dans le timezone de l'événement avec mention explicite ("18h00 heure locale Maurice"). Helper `formatInTimezone` à utiliser partout dans l'UI.
> Note : exigences déjà portées par F01/F04-F08 (UTC en base, `timezone` NOT NULL pré-rempli du voyage, helper central `lib/events/datetime.ts`, mention "heure locale {fuseau}" sur le détail). Ce ticket ajoute la mention sur la vue liste et un audit de conformité : zéro `toLocaleString`, `date-fns-tz` hors helper limité à `fromZonedTime` (chemin d'écriture des actions). Les dates pures (voyages, coffre) restent en `date-fns` sans tz — pas d'heure en jeu.

### [x] PHIL-F10 — Attacher un document à un événement *(fait le 2026-07-03)*
Composant réutilisable "Document picker" : onglet 1 "Documents du voyage" (liste), onglet 2 "Mon coffre" (liste filtrée à mes documents personnels, partage automatique au voyage si sélectionné), onglet 3 "Uploader un nouveau". À la sélection, création de la ligne `event_documents` (et `document_shares` si nécessaire).
> Note : `components/documents/document-picker.tsx` (Dialog + Tabs shadcn, listes chargées côté client via RLS). Coffre → **partage auto** `document_shares` (propriétaire uniquement) + log `SHARE`, puis liaison `event_documents`. Détachement possible (liaison seulement, le partage reste — retrait en E05). **Écart** : onglet "Uploader un nouveau" différé à G02 (upload direct voyage) — lien vers `/vault/new` en attendant. Vérifié en réel : attache depuis le coffre = partage + liaison + audit SHARE.

### [x] PHIL-F11 — Participants d'un événement *(demandé et fait le 2026-07-04)*
Sur un événement (activité, transport, hébergement), pouvoir indiquer **qui participe** (optionnel — à 9, tout le monde ne plonge pas). Table `event_participants` (event_id, user_id). Chacun peut s'inscrire/se retirer lui-même ; OWNER/EDITOR peuvent cocher les autres. Affichage : avatars/noms sur la page de l'événement, compteur. Sans inscription = événement pour tout le groupe (comportement par défaut inchangé).
> Note : migration `20260703230708`, RLS — lecture pour tout membre du voyage, inscription/retrait pour soi-même ou par OWNER/EDITOR pour n'importe quel membre. Section "Qui est de la partie ?" sur la page événement : puces avatar+nom cliquables (✓ bordeaux = inscrit), compteur, "Tout le groupe" si personne d'inscrit. Vérifié en réel : inscription de soi + d'Amelie par le capitaine, 2 lignes en base.

---

## Catégorie G — Documents partagés du voyage

### [x] PHIL-G01 — Page documents du voyage *(fait le 2026-07-03)*
Onglet "Documents" du voyage. Liste tous les documents `scope=TRIP` du voyage + ceux partagés depuis les coffres via `document_shares`. Filtres par type, par propriétaire. Indique clairement quels documents viennent d'un coffre personnel (badge "Partagé par X").
> Note : fusion des deux sources triée par date, badges "Partagé par X" (laiton, coffre) vs "Ajouté par X" (neutre, voyage), filtres catégorie + voyageur en query params (le filtre voyageur n'apparaît qu'à partir de 2 propriétaires). Ouverture directe via le viewer E03a. Docs soft-deleted exclus des deux sources.

### [x] PHIL-G02 — Upload direct dans le voyage *(fait le 2026-07-03)*
Bouton "Ajouter un document" qui upload directement avec `scope=TRIP` et `trip_id` rempli. Visible immédiatement par tous les participants. Catégorisation au moment de l'upload.
> Note : formulaire d'upload **factorisé** en `components/documents/upload-form.tsx` (partagé coffre/voyage, action et libellés en props) — la dette "onglet upload du picker F10" est de fait soldable en y branchant ce composant si besoin. Action `createTripDocument` : scope=TRIP, RLS insert = OWNER/EDITOR, rollback du blob si échec, pas de log vault (réservé au coffre). Catégorie par défaut "Billet". Vérifié en réel : upload → visible dans l'onglet avec badge "Ajouté par".

### [x] PHIL-G03 — Visualisation des documents du voyage *(fait le 2026-07-03)*
Réutilise le viewer E03a. Pas de filigrane sur les documents `scope=TRIP` (ce sont des documents partagés du voyage, pas des pièces d'identité). Après la Phase 9, le filigrane s'applique uniquement aux docs `scope=VAULT` même quand on les visualise via un voyage.
> Note : couvert par le viewer E03a, conçu pour (accès par RLS quel que soit le scope, log VIEW conditionné à `scope=VAULT`). Vérifié : doc TRIP servi en 200 `application/pdf` + `private, no-store`, **zéro entrée d'audit ajoutée** (réservé au coffre). E03b n'aura à toucher que la branche VAULT.

### [x] PHIL-G04 — Suppression d'un document du voyage *(fait le 2026-07-03)*
Possible par : (a) le propriétaire du document, (b) un OWNER du voyage. Confirmation requise. Loggué.
> Note : bouton corbeille sur les lignes de documents TRIP (visible si propriétaire ou capitaine — la policy RLS `documents_delete_owner_or_trip_owner` de B10 porte le droit), AlertDialog de confirmation, suppression ligne + blob storage, DELETE loggué dans `vault_access_log`. Les docs du coffre partagés au voyage n'ont pas ce bouton : leur cycle de vie se gère depuis le coffre (partage/retrait). Vérifié en réel : dialog → suppression → disparu de la liste et de la base, log DELETE écrit.

---

## Catégorie H — Idées d'activités

### [x] PHIL-H01 — Page idées d'activités *(fait le 2026-07-03)*
Onglet "Idées" du voyage. Liste des idées en pool avec : titre, description tronquée, lieu, durée estimée, coût estimé, tags, créateur, nombre de votes. Filtres et tri (par votes, par création, par tags).
> Note : cards `components/ideas/idea-card.tsx` (description en line-clamp, lieu/durée/coût/lien avec icônes, tags en pastilles, "proposé par X"). Tri "plus votées" (défaut) / "plus récentes" + filtre par tag en query params, tags découverts dynamiquement. Idées SCHEDULED affichées estompées avec badge "Planifié" (H04). Compteur de voix statique — le vote interactif est H03. Bouton "Proposer" pour OWNER/EDITOR (aligné sur la policy B06).

### [x] PHIL-H02 — Création d'une idée *(fait le 2026-07-03)*
Formulaire : titre, description, lien externe optionnel, lieu optionnel, durée et coût estimés, tags. Pas de date à ce stade.
> Note : tags saisis en texte libre séparés par virgules, normalisés (minuscules, `#` retiré, max 10). Devise EUR par défaut si coût renseigné. RLS insert = OWNER/EDITOR (B06).

### [x] PHIL-H03 — Vote / like sur une idée *(fait le 2026-07-03)*
Bouton de vote (heart ou +1) par participant, max 1 vote par user et par idée. Compteur visible. Permet d'identifier les favorites du groupe sans débat.
> Note : bouton cœur toggle (`vote-button.tsx` + action `toggleVote`) — 1 voix max garantie par la PK `(idea_id, user_id)` et les policies de B06, retrait de sa propre voix uniquement, VIEWER peut voter. État voté = cœur plein bordeaux. Vérifié en réel : toggle aller-retour.

### [x] PHIL-H04 — Conversion idée → événement planifié *(fait le 2026-07-03)*
Sur une idée, bouton "Planifier". Ouvre le formulaire de création d'événement ACTIVITY pré-rempli avec les infos de l'idée. À la création, l'idée passe en statut `SCHEDULED` et garde une référence vers l'événement. Restera visible dans la liste des idées avec un badge "Planifié le X".
> Note : bouton "Planifier" (OWNER/EDITOR, idées POOL) → `/events/new?ideaId=…`, formulaire ACTIVITY pré-rempli (titre, description, lieu, durée, coût, lien). À la création : idée → SCHEDULED + `scheduled_event_id`. Badge **"Planifié le {date}"** (dans le fuseau de l'événement) cliquable vers l'événement. Vérifié en réel : conversion complète, vote conservé, bouton Planifier retiré.

### [x] PHIL-H05 — Rejet ou archivage d'une idée *(fait le 2026-07-03)*
Bouton "Pas pour ce voyage" qui passe l'idée en statut `DISMISSED`. Filtre par défaut masque les dismissed mais on peut les afficher.
> Note : bouton "Pas pour ce voyage" (OWNER/EDITOR, idées non planifiées uniquement) → `DISMISSED`, masquées par défaut ; lien "Voir les écartées" (`?dismissed=1`) avec bouton "Ressortir" → retour en POOL. Droit porté par la policy UPDATE existante. Vérifié en réel dans les deux sens (transition DISMISSED↔POOL en base).

---

## Catégorie I — Mode offline & PWA

### [x] PHIL-I01 — Configuration PWA avec Serwist *(fait le 2026-07-03)*
Installer Serwist, configurer le manifest PWA (nom "Phil", icônes, theme color, display standalone). Vérifier que l'application est installable depuis Safari iOS et Chrome Android via "Ajouter à l'écran d'accueil".
> Note : **écart technique** — `@serwist/next` est incompatible avec Turbopack (Next 16, issue serwist#54) : le SW utilise la **runtime Serwist** mais est bundlé par esbuild (`npm run build:sw`, chaîné dans `build`), sans précache injecté (cache au fil de l'eau, suffisant — I02 affine). Manifest via `app/manifest.ts` (standalone, parchemin), icônes monogramme "P" générées (192/512/apple-touch, SVG→PNG via sharp), enregistrement SW en prod seulement. Manifest/sw/icônes ajoutés aux chemins publics du proxy (sinon redirigés vers login !). Vérifié sur build prod : manifest 200 standalone, sw.js 200, icônes 200. Installabilité réelle iOS/Android à confirmer sur téléphone après déploiement.

### [x] PHIL-I02 — Stratégie de cache des assets statiques *(fait le 2026-07-03)*
Cache-first pour les assets Next.js (JS, CSS, fonts, images). Network-first avec fallback cache pour les pages HTML. Update du service worker en arrière-plan avec notification utilisateur "Nouvelle version disponible".
> Note : 3 caches avec ExpirationPlugin — `phil-static` (JS/CSS/fonts hashés, cache-first 30 j), `phil-images` (`/_next/image` + icônes, 7 j / 100 entrées), `phil-pages` (network-first, timeout 4 s, repli cache). Mise à jour : `skipWaiting` désactivé, bannière "Nouvelle version disponible" → `SKIP_WAITING` → reload sur `controllerchange`. Le flow complet de mise à jour se vérifiera naturellement entre deux déploiements prod.

### [x] PHIL-I03 — Cache offline des données voyage *(fait le 2026-07-03)*
Setup Dexie.js (wrapper IndexedDB). Tables locales : `trips`, `events`, `documents_metadata`, `ideas`. Quand l'user ouvre un voyage en ligne, sync automatique des données dans IndexedDB. Bouton explicite "Préparer pour offline" qui force la synchro complète.
> Note : base `phil-offline` (Dexie v1) + table `sync_meta` (horodatage et compteurs par voyage). `syncTrip()` lit via le client de session — **la RLS borne ce qui peut être caché**. Synchro silencieuse au montage du layout voyage (si en ligne) + bouton "Préparer pour offline" dans Paramètres avec horodatage. `documents_meta` inclut les docs TRIP et les partagés du coffre (métadonnées seulement — les fichiers, c'est I04). Vérifié en réel : ouverture du voyage → IndexedDB peuplé (trip, events, idées, méta).

### [x] PHIL-I04 — Cache offline des documents *(fait le 2026-07-03)*
Sur un document, bouton "Disponible offline". Téléchargement du fichier tel que servi par le viewer au moment du téléchargement (avec filigrane pour les docs du coffre une fois E03b en place). Stockage dans IndexedDB. Indicateur visuel "Offline" sur les documents disponibles. Limite de stockage configurable (par défaut 100 Mo).
> Note : Dexie v2 (`document_blobs`), téléchargement **via le viewer authentifié** (audit VIEW compris, filigrane automatique après E03b). Limite 100 Mo contrôlée avant écriture avec message. Toggle `OfflineDocToggle` sur la fiche coffre et les lignes de documents du voyage, badge "Offline", ouverture par object URL depuis `/offline` ("Ouvrir (offline)" / "non téléchargé"). Vérifié en réel : toggle → blob en IndexedDB → ouvrable hors ligne.

### [x] PHIL-I05 — Mode lecture offline *(fait le 2026-07-03)*
Détection de l'absence de réseau via `navigator.onLine` + ping périodique. Bandeau "Mode offline" affiché. Toutes les pages voyages, événements, documents marqués offline restent accessibles. Les actions d'écriture sont désactivées avec message "Reconnectez-vous pour modifier".
> Note : hook `useOnlineStatus` (événements + ping /api/health 30 s), bandeau global encre "consultation seulement" avec lien vers **`/offline`** — vue 100 % client depuis Dexie (programme par jour, docs, idées, horodatage), précachée par le SW et servie en **fallback de navigation** hors cache. Pages déjà visitées : servies par `phil-pages`. **Écart v1** : pas de désactivation bouton par bouton — le bandeau porte le message, et les actions serveur échouent naturellement hors ligne. Vérifié : /offline rend les données locales, bandeau apparaît/disparaît aux événements réseau.

### [x] PHIL-I06 — Resync à la reconnexion *(fait le 2026-07-03)*
Quand le réseau revient, refetch automatique des données voyage en cours. Notification discrète "Données synchronisées". Pas de gestion de conflit puisque l'écriture offline n'est pas supportée en v1.
> Note : dans `TripOfflineSync` — événement `online` → `router.refresh()` (données serveur) + `syncTrip()` (cache Dexie) + toast "Données synchronisées" auto-effacé (4 s). Vérifié en réel (événement simulé).

---

## Catégorie J — Sécurité, RGPD & qualité

### [x] PHIL-J01 — Headers de sécurité *(fait le 2026-07-03)*
Configuration Next.js (`next.config.js` ou middleware) : Content-Security-Policy stricte, Strict-Transport-Security, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy pour limiter les API navigateur.
> Note : `headers()` dans `next.config.ts`. CSP : `script-src 'self' 'unsafe-inline'` (requis par l'hydratation Next sans infra de nonces — durcissement possible plus tard), `connect-src` limité à l'origine Supabase, `img-src https:` (couvertures URL libre), `frame-src 'self' blob:` (viewer PDF + offline), `frame-ancestors 'none'`, `object-src 'none'`. HSTS 2 ans + sous-domaines. Vérifié sur build prod : les 6 headers présents, app fonctionnelle sous CSP.

### [ ] PHIL-J02 — Rate limiting sur les endpoints critiques
Limitation par IP et par user sur : login, upload de document, accès à un document, création d'invitation. Implémentation avec Upstash Redis (free tier 10k commandes/jour) ou via les headers Vercel Edge Config.

### [x] PHIL-J03 — Validation Zod sur tous les endpoints *(fait le 2026-07-03)*
Tout input utilisateur (formulaires, paramètres URL, body API) validé par un schéma Zod avant traitement. Erreurs renvoyées avec messages clairs côté client.
> Note : audit complet des 15 fichiers d'actions + routes API. Les formulaires étaient déjà tous sous schéma Zod ; trous comblés sur les **IDs passés bruts** via `lib/validation.ts` (`areUuids`) : `toggleVote`, `detachDocument`, `cancelInvitation`, `deletePasskey`, route viewer (400). Les réponses WebAuthn sont validées cryptographiquement par simplewebauthn (leur schéma Zod serait redondant). SearchParams (filtres) : listes blanches déjà en place (E08, E02).

### [x] PHIL-J04 — Politique de confidentialité et mentions légales *(fait le 2026-07-03)*
Pages `/privacy` et `/legal` avec : finalité du traitement, données collectées, durée de conservation, droits RGPD (accès, rectification, suppression, portabilité), contact. Lien dans le footer.
> Note : pages publiques (proxy), ton Phil (privé, non commercial, pas de tracking), stockage UE (Supabase Irlande) mentionné, droits RGPD renvoyant vers l'export/suppression du profil (C06/C07, tickets suivants de la phase). Footer global discret dans le layout racine. Vérifié en rendu réel.

### [x] PHIL-J05 — Bannière cookies / consentement *(fait le 2026-07-03)*
Bannière minimaliste au premier visite : pas de tracking analytics par défaut, donc pas de bannière "accepter / refuser" complexe. Mention "Ce site utilise des cookies techniques nécessaires à l'authentification" sans bouton.
> Note : bandeau informatif à la première visite (cookies techniques uniquement, aucun tracking), bouton "Compris" mémorisé en localStorage, lien /privacy. Pas de recueil de consentement : rien d'optionnel ni de traçant. Vérifié en réel : affichée, disparaît, ne revient pas.

### [ ] PHIL-J06 — Audit de dépendances
Activation de Dependabot ou Renovate sur le repo GitHub pour les MAJ de sécurité automatiques (fonctionnalité GitHub native, sans CI). `npm audit` à lancer régulièrement en local, et systématiquement avant un déploiement important.

### [ ] PHIL-J07 — Backup base de données
Supabase fait des backups automatiques quotidiens (rétention 7 jours sur free tier). Documenter la procédure de restauration. Optionnel : export hebdomadaire vers un stockage tiers via cron.

### [ ] PHIL-J08 — Plan de réponse à incident
Document `INCIDENT.md` avec : que faire en cas de fuite de données, contacts CNIL, procédure de notification aux utilisateurs, checklist de remédiation. Pas critique pour un usage perso mais bonne hygiène.

---

## Catégorie K — Notifications & emails

### [x] PHIL-K01 — Setup Resend et templates de base *(fait le 2026-07-03)*
Créer un compte Resend, vérifier un domaine (au début, on utilise leur domaine de test, plus tard un domaine perso). Setup React Email pour des templates en JSX. Templates de base : invitation voyage, alerte expiration document, rappel événement J-1. Signature des emails : "À bientôt sur la route, Phil".
> Note : compte Resend créé, clé API en `.env.local` + Vercel (scripts fournis). Expéditeur `onboarding@resend.dev` (mode test : envois limités à l'adresse du compte) — **domaine vérifié à prévoir avant Maurice** pour envoyer aux amis ; D05 affichera aussi le lien d'invitation à copier en secours. Templates React Email aux couleurs Phil (`lib/email/templates/` : shell commun + invitation, expiration, rappel J-1). Envoi réel testé et reçu.

### [x] PHIL-K02 — Email d'invitation à un voyage *(fait le 2026-07-03)*
Template clair : nom de l'inviteur, nom du voyage, dates, destination, bouton "Rejoindre le voyage", lien de fallback. Envoi via Resend API depuis l'endpoint d'invitation.
> Note : envoi branché dans `createInvitation` (template K01). **Échec d'envoi non bloquant** : en mode test Resend (adresses hors compte refusées), l'invitation reste valide et le message oriente vers le lien copiable. Vérifié en réel : email reçu avec le vrai token.

### [x] PHIL-K03 — Email d'alerte expiration document *(fait le 2026-07-03)*
Envoyé par le cron job d'expiration. Template : "Votre passeport expire dans X jours". Lien vers le coffre. Possibilité de désactiver ces alertes dans les préférences.
> Note : template `DocumentExpiryEmail` (K01) branché dans le cron E07 — nom du document, catégorie, jours restants, bouton "Ouvrir mon coffre". Désactivable via `expiry_alerts` (K04), vérifié avant chaque envoi. Envoi réel testé et reçu (J-30).

### [x] PHIL-K04 — Préférences de notification *(fait le 2026-07-03)*
Page dans le profil pour activer/désactiver chaque type d'email (invitations, alertes expiration, rappels événements). Stockage dans `profiles.notification_preferences` (JSONB).
> Note : JSONB `notification_preferences` (défaut tout activé), schéma Zod + parse tolérant (`lib/notifications/preferences.ts`), 3 interrupteurs dans le profil avec sauvegarde immédiate et rollback si échec. E07/K03 lisent `expiry_alerts` avant envoi. Vérifié en réel : toggle → JSONB mis à jour en base.

---

## Catégorie L — Évolutions futures (à creuser)

### [x] PHIL-L03 — Périmètre du coffre : catégories et rattachement aux voyages *(analysé et tranché le 2026-07-04 — option A)*
Question soulevée : pourquoi "Hébergement", "Billet" et "Voucher" apparaissent-ils dans les filtres du coffre, alors que la plongée (billet) vit dans les documents du voyage ? Réponse courte : l'enum `document_category` est **partagé** entre coffre et documents de voyage, et l'UI du coffre affiche toutes les catégories — un héritage technique, pas un choix produit. À analyser :
- **Option A (recommandée a priori)** : restreindre le coffre aux catégories personnelles (passeport, CNI, permis, assurance, autre) ; billet/voucher/hébergement uniquement dans les documents de voyage. L'upload coffre ne propose plus ces catégories ; message d'orientation "ce document semble appartenir à un voyage → ajoute-le là-bas".
- **Option B** : garder toutes les catégories au coffre mais permettre d'**associer un document du coffre à un voyage** dès l'upload (= pré-remplir un partage), avec comportements par défaut par catégorie : passeport/CNI/permis jamais partagés par défaut ; hébergement/location de voiture proposés au partage équipage.
- Trancher avec l'usage réel : un "hébergement Maurice" a-t-il une raison d'être privé (confirmation nominative avec n° de carte ?) ou est-il par nature un document du groupe ?
> Note : **option A retenue** (choix d'Yves). `VAULT_CATEGORIES` = passeport, CNI, permis, assurance, autre ; `TRIP_CATEGORIES` = billet, voucher, hébergement, assurance, autre. Appliqué aux filtres du coffre, aux formulaires d'upload (coffre et voyage, `UploadForm` gagne une prop `categories`), à l'édition, **et aux schémas Zod côté serveur**. Message d'orientation sur l'upload coffre ("billets, vouchers, hébergements → Documents du voyage"). L'enum Postgres reste inchangé (les docs existants et les filtres de l'onglet voyage — qui affichent aussi les partages du coffre — gardent toutes les catégories).

### [x] PHIL-L01 — Hébergements candidats (multi-options) *(fait le 2026-07-04)*
Permettre de saisir plusieurs options d'hébergement pour un même créneau avant de faire un choix définitif. Cas d'usage : comparer 3 Booking pour une nuit (prix, conditions d'annulation, distance), voter en groupe, puis convertir le choix retenu en événement LODGING. Cas d'usage secondaire : prendre 2 logements simultanés pour un même groupe (ex : ski, groupe > capacité d'un seul logement). Analyser si on étend `trip_events` (statut `CANDIDATE` réutilisant le mécanisme votes/conversion des idées) ou si on crée un concept dédié de "candidats".
**Décision du 2026-07-04 : retenu (vague 3), avec vote pondéré** (et non un simple +1) — format à définir avec L02.
> Note : **concept dédié** `lodging_candidates` retenu (pas de statut CANDIDATE sur `trip_events` : calendrier, iCal, rappels J-1 et carte supposent des événements réels). Créneau = même paire check-in/check-out (groupement d'affichage, pas de table de slots). RLS : proposition par tout membre (collaboratif comme les idées), choix/rejet OWNER/EDITOR, suppression auteur/OWNER. Page `/trips/{id}/lodging` (carte d'accès en tête des Idées) : options groupées par créneau (titre, lien, prix libre, notes, auteur), "Choisir → calendrier" crée l'événement LODGING (check-in 15h / check-out 11h, fuseau du voyage, lien en `external_url`, géocodage N01) et marque le candidat Retenu ; **plusieurs choix possibles sur un même créneau** (cas ski) ; Écarter/Remettre en lice réversible. `verify:rls` 30/30. Le vote pondéré arrive avec L02.

### [x] PHIL-L02 — Avis qualitatifs et aide à la décision *(fait le 2026-07-04)*
Aller au-delà du vote +1 sur les idées : permettre des avis qualitatifs ("Vaut le coup", "Optionnel", "Trop cher") sur les activités et hébergements candidats. Inspiration : les colonnes "Vaut le coup ?" et "Choix 1/2" du spreadsheet Islande. Analyser le bon format (tags prédéfinis, commentaires libres, notation 1-5, etc.).
**Décision du 2026-07-04 : retenu (vague 3)** — porte le vote pondéré des hébergements candidats (L01).
> Note : format retenu = **3 avis pondérés** façon spreadsheet Islande — "Vaut le coup" (+2), "Optionnel" (+1), "Plutôt non" (−1) — + **commentaire libre** (≤ 300 car.). Table `candidate_votes` (PK candidat+user, un avis par personne, modifiable/retirable, RLS via helper `private.candidate_trip_id`). Sur chaque carte candidat : badge **Score** (somme) + nombre d'avis, mes 3 boutons (le mien surligné), champ commentaire, liste des avis nominatifs avec citations. **Écart assumé** : les idées d'activités gardent le +1 simple (H03) — étendre le vote pondéré aux idées se fera sur demande si le besoin se confirme. `verify:rls` 30/30.

---

## Catégorie N — Vague 2 (arbitrée avec Yves le 2026-07-04)

Ordre de réalisation : N01 → N02 → N03 → N07 → N08 → N04 → N05 → N06 → N11 → N12 → N10 → N09.
Écartés pour l'instant : météo (backlog, fiabilité à vérifier), commentaires (plus tard), galerie photos (non), PDF souvenir (plus tard), rappels J-1 par email (remplacés par push).

### [x] PHIL-N01 — Cartes du voyage (jour par jour + activités) *(fait le 2026-07-04)*
Deux cartes Leaflet + OpenStreetMap (gratuit, sans clé), esprit Polarsteps :
1. **Carte du programme** (onglet du voyage) : les événements épinglés (couleur par type), tracé chronologique jour par jour, popup → lien fiche événement. Sélecteur de jour pour filtrer.
2. **Carte des idées** : les idées géolocalisées du pool, pour juger les distances entre elles et avec l'hébergement.
Les colonnes `location_lat/lng` existent déjà (events et ideas) mais ne sont pas saisies : ajouter le **géocodage Nominatim** (gratuit, 1 req/s) du champ lieu à la création/édition (+ correction manuelle en déplaçant le marqueur). Distances à vol d'oiseau affichées depuis l'hébergement du moment.
> Note : page `/trips/[tripId]/map` (bouton "Carte" au calendrier) — vues Programme (pions colorés par type, tracé chronologique pointillé, filtre par jour) et Idées (+ hébergement en repère laiton). Distances haversine depuis l'hébergement couvrant le jour filtré, popups avec lien fiche. Leaflet + OSM, chargement client (`ssr:false`), pions `divIcon` colorés (pas d'assets). Géocodage **serveur** Nominatim (`lib/geo/locate.ts`, contextualisé par la destination, best-effort jamais bloquant) branché sur la création d'événements (3 types, ids désormais pré-générés) et d'idées. **Écarts** : pas de correction manuelle du marqueur en v1 (re-géocodage via édition du lieu) ; géocodage non branché sur l'édition. Démo Maurice géocodée (17 lieux). Vérifié en réel : carte du 7 nov (plongée), carte des idées (7 pions).

### [x] PHIL-N02 — Export calendrier iCal *(fait le 2026-07-04)*
Flux iCal par voyage (`/api/trips/{id}/calendar.ics?token=…`, token propre au participant, révocable) à abonner dans Google Calendar/Apple Calendar. Chaque événement exporte : titre, horaires **avec timezone**, lieu, notes/description, et **liens vers les documents attachés** (URL de la fiche événement Phil — les fichiers eux-mêmes restent derrière l'authentification).
> Note : colonne `calendar_token` (unique) sur `trip_participants`, route publique au proxy mais authentifiée par jeton (les agendas ne portent pas de session). ICS généré à la main : horaires en **UTC strict Z** (instant exact, l'agenda affiche dans le fuseau du lecteur), LOCATION, DESCRIPTION = notes + lien fiche Phil, échappement iCal. Carte "Dans ton agenda" (URL copiable) dans les Paramètres du voyage. **Écarts** : jeton non révocable en v1 (pas d'UI de régénération) ; les documents attachés sont représentés par le lien vers la fiche (les fichiers restent authentifiés). Vérifié : 12 VEVENT valides, 403 sur jeton invalide.

### [x] PHIL-N03 — Templates de voyage *(fait le 2026-07-04)*
À la création d'un voyage : "Vierge" ou choix d'un template (**Roadtrip**, **Vacances chill**, **Ski**, …). Un template pré-remplit : idées types (ski : forfaits, location matériel ; roadtrip : étapes), checklists types (N11), catégories d'événements suggérées. Templates définis en code (pas d'éditeur v1). Plus tard : "dupliquer un voyage existant comme template".
> Note : `lib/trips/templates.ts` (3 templates : Roadtrip 5 idées, Chill 5, Ski 6 — avec descriptions et tags), sélecteur en cartes en tête du formulaire de création (Vierge par défaut), insertion des idées après création du voyage. **Les checklists types viendront avec N11** (le template est prêt à les porter). Vérifié en réel : création "TEST Template Ski" via l'UI → 6 idées pré-remplies, puis nettoyé.

### [x] PHIL-N04 — OCR MRZ du passeport + validité vs voyages *(fait le 2026-07-04)*
À l'upload d'un passeport (image) dans le coffre : lecture de la bande MRZ (tesseract.js + parsing `mrz` avec **sommes de contrôle** — lecture douteuse = rejetée, jamais de pré-remplissage faux), pré-remplissage du numéro et de la **date d'expiration** (modifiables). PDF : v1 saisie manuelle.
**Contrôle de validité** : à la création d'un voyage et sur la page du voyage, si le passeport du participant expire avant la fin du voyage **ou moins de 6 mois après la date de retour** → avertissement visible ("Certains pays exigent 6 mois de validité après le retour"). L'alerte email 6 mois avant expiration existe déjà (E07, seuil J-180).
> Note : OCR 100 % navigateur (`lib/vault/mrz.ts`) — tesseract.js **auto-hébergé** dans `public/ocr/` (worker + wasm + eng.traineddata, ~14 Mo chargés uniquement au scan ; la CSP interdit les CDN), whitelist A-Z0-9<, parsing `mrz` avec **checksums** : pré-remplissage du n° et de l'expiration seulement si les sommes de contrôle passent ("lue et vérifiée ✓"), sinon message d'incertitude. Bandeau de validité dans le **layout du voyage** (toutes les pages) : bordeaux si le passeport expire avant la fin du voyage, laiton si < 6 mois après le retour. Vérifié en réel : expiration au 2027-01-15 → avertissement 6 mois rendu (puis restauré). L'OCR réel sera éprouvé au premier upload d'un vrai passeport photo.

### [x] PHIL-N05 — Partage à durée limitée *(fait le 2026-07-04)*
Sur un partage de document du coffre (équipage ou ciblé E09) : échéance optionnelle, par défaut proposée = date de fin du voyage. Colonne `expires_at` sur `document_shares`, RLS mise à jour (partage expiré = invisible), purge par le cron quotidien existant, affichage "expire le …" dans la liste des partages.
> Note : helper `is_document_shared_with_user` et policy select des partages exigent `expires_at IS NULL OR > now()` ; champ "Jusqu'au" dans le dialogue (défaut = fin du voyage, vide = permanent), échéance affichée dans la liste, purge des partages échus par le cron quotidien E07. Vérifié en réel : partage expiré invisible, prolongé visible ; `verify:rls` 30/30.

### [x] PHIL-N06 — Fiche d'urgence *(fait le 2026-07-04)*
Par voyageur et par voyage : contacts d'urgence, n° de police d'assurance + téléphone assisteur, groupe sanguin/allergies (optionnel), ambassade du pays de destination, copies des papiers partagés. **Digitale** (page du voyage, visible de l'équipage), **partagée**, **imprimable** (mise en page dédiée via CSS print). Données sensibles → mêmes protections que le coffre pour les champs médicaux.
> Note : table `emergency_sheets` (PK trip+user), RLS lecture équipage / écriture titulaire seulement (participant du voyage exigé). Page `/trips/[id]/emergency` (lien depuis Participants) : formulaire "Ma fiche" (upsert), cartes de l'équipage, compteur x/n remplies, bouton **Imprimer** (variantes Tailwind `print:` : formulaire et nav masqués, cartes en 2 colonnes, `break-inside-avoid`). **Écarts** : champ ambassade = zone Notes (pas d'annuaire automatique) ; champs médicaux protégés par la RLS du voyage (pas de verrou passkey — ils doivent rester accessibles à l'équipage en urgence, c'est l'objet de la fiche). Vérifié : écriture own 201, usurpation 403, lecture équipage OK.

### [x] PHIL-N07 — Notifications push PWA + paramétrage *(fait le 2026-07-04 — test réel en prod à faire)*
Web Push (VAPID) : table `push_subscriptions`, abonnement depuis l'app installée, envoi côté serveur (lib `web-push`). Événements notifiés : invitation reçue, idée proposée, sondage ouvert (N12), rappel J-1 (N08), alerte passeport. **Page de paramétrage** dans le profil : un interrupteur par type de notification push (étend le modèle K04), activation/désactivation de l'appareil.
> Note : table + RLS own, clés VAPID générées (`.env.local` ; **`! bash tmp/set-vercel-vapid.sh` à lancer pour la prod**), `sendPushToUser()` (respecte les prefs K04, purge les abonnements 404/410), handlers push/click dans le SW, interrupteur "cet appareil" au profil (sous les prefs par type). Branchements émetteurs : à faire au fil des tickets (N08 rappels, invitations, N12). **Test réel en prod requis** (le SW ne tourne pas en dev) : activer sur téléphone après déploiement + clés Vercel.

### [x] PHIL-N08 — Rappels J-1 par notification push *(fait le 2026-07-04)*
Le second slot cron Vercel (quotidien) parcourt les événements de demain et notifie en push les participants concernés (inscrits à l'événement si liste F11 non vide, sinon tout l'équipage). Respecte les préférences N07. (L'email J-1 est abandonné — décision du 2026-07-04.)
> Note : cron 16 h UTC (second et dernier slot Hobby) → `/api/cron/event-reminders` (CRON_SECRET). Fenêtre "demain" = starts_at entre +24 h et +48 h (approximation UTC documentée). Destinataires : inscrits F11 sinon équipage, préférence `event_reminders` respectée par `sendPushToUser`. Corps : heure locale + lieu, clic → fiche événement. Vérifié : 401 sans secret, 200 avec (0 événement demain — normal). Effet réel visible après activation du push en prod.

### [x] PHIL-N09 — Budget partagé *(fait le 2026-07-04)*
Sur un événement ou en dépense libre : montant, devise, **payé par**, **pour qui** (défaut : les participants F11 de l'événement, sinon tout l'équipage). Vue Budget du voyage : total, dépenses par personne, **soldes** ("Yves doit 42 € à Amelie") avec algorithme de règlement simplifié. Pas de paiement intégré — juste les comptes clairs.
> Note : tables `expenses` + `expense_beneficiaries` (bénéficiaires **matérialisés** à la création : soldes stables si l'équipage change ; RLS : membres, `paid_by` doit être membre, suppression = créateur/payeur/OWNER). Onglet **Budget** : formulaire (titre, montant, devise, payé par, "pour qui" cocher — défaut tous), soldes par devise (payé/part/net), **règlements simplifiés** (glouton), liste des dépenses. **Écarts** : dépense non rattachable à un événement dans le formulaire v1 (colonne `event_id` prête) ; soldes séparés par devise (pas de conversion). Logique de soldes vérifiée par test (conservation des flux : A→Y 15 + B→Y 30 = net +45).

### [x] PHIL-N10 — Mode "Aujourd'hui" *(fait le 2026-07-04)*
Pendant le voyage, l'accueil du voyage devient la vue du jour : événement **en cours**, le **prochain départ** avec compte à rebours et lieu de RDV, les documents utiles du jour, accès à la carte du jour (N01). C'est l'écran qu'on regarde dix fois par jour sur place — pensé mobile d'abord.
> Note : hero "Aujourd'hui" en tête du calendrier quand le voyage est en cours — carte "EN CE MOMENT" (bordeaux, événement dont on est entre début et fin) + "PROCHAIN DÉPART" (compte à rebours client rafraîchi 30 s, heure locale, lieu de RDV), lien "La journée heure par heure" (vue jour F02). **Écart** : les documents du jour ne sont pas remontés dans le hero (accessibles via la fiche événement à un tap). Vérifié en réel : voyage décalé sur aujourd'hui → les deux cartes rendues, puis démo restaurée.

### [x] PHIL-N11 — Checklist partagée *(fait le 2026-07-04)*
Par voyage : items cochables, assignables à un participant ("Enceinte — Amelie"), sections (avant le départ / à emporter / sur place), progression visible. Alimentée par les templates N03.
> Note : table `checklist_items` — RLS collaborative (tout participant lit/ajoute/coche/assigne, suppression = auteur ou OWNER, `created_by` verrouillé au sien). Onglet **Checklist** dans les tabs du voyage : 3 sections, barre de progression bordeaux, ajout inline, case à cocher, sélecteur d'assignation, corbeille. Les templates N03 pré-remplissent désormais aussi la checklist (roadtrip/chill/ski, 4 items chacun). Vérifié via RLS : ajout 201, coche+assignation 200, usurpation `created_by` 403, suppression créateur 200 ; page rendue côté serveur (3 sections + formulaires).

### [x] PHIL-N12 — Sondages éclair *(fait le 2026-07-04)*
"Resto ce soir : créole ou italien ?" — question + 2-5 options, vote en un tap, résultat en direct, clôture manuelle ou automatique. Plus léger qu'une idée : durée de vie courte, pas de conversion en événement. Notification push à l'ouverture (N07).
> Note : tables `polls` (options text[] 2-5, contrainte check) + `poll_votes` (PK poll+user, vote modifiable tant qu'ouvert, **bloqué après clôture par la RLS**). Section en tête de l'onglet Idées : création par tout participant (question + une option par ligne), barres de résultats en direct, ✓ sur mon vote, clôture par créateur/OWNER, 5 derniers sondages affichés. Push à l'ouverture vers les autres membres (sans préférence dédiée — écart, à raccrocher à un type si besoin). **Écart** : pas de clôture automatique. Vérifié via RLS : création/vote/changement OK, vote post-clôture rejeté.

---

## Catégorie O — Vague 3 (arbitrée avec Yves le 2026-07-04, analyse concurrentielle)

Ordre de réalisation proposé : O04 → O08 → O02 → O03 → O06 → O07 → O05 → O09 → O10 → O01 → L01 → L02.
Arbitrages : suivi de vol temps réel **écarté** (APIs payantes ou quotas dérisoires — un lien vers l'app de la compagnie suffit, O07) ; la discussion de groupe **reste sur WhatsApp** (Phil pointe vers le groupe, O06) ; galerie photos **ré-ouverte avec quota strict** (qualité d'origine conservée, nombre limité — remplace le "non" de la vague 2).

### [x] PHIL-O01 — Import de réservation par fichier *(fait le 2026-07-04 — test réel après pose de la clé Gemini)*
Depuis un voyage : uploader le **PDF** (cas nominal — multi-pages géré nativement) ou **une ou plusieurs captures d'écran** d'une confirmation Booking/SNCF/compagnie → extraction des infos (type, dates/horaires, lieu, référence) et pré-remplissage d'un événement TRANSPORT/LODGING **à valider avant création**, document attaché au passage. Choix retenu plutôt qu'une boîte mail dédiée : pas d'infra email entrante, pas d'ambiguïté "quel voyage ?" (on est déjà dedans), et l'utilisateur a toujours le PDF sous la main. Évolution v2 possible : boîte mail entrante (Resend inbound ou Cloudflare Email Routing, gratuits) avec alias par voyage.
**LLM requis** pour une extraction robuste multi-fournisseurs (des parsers par regex/fournisseur seraient ingérables). **Démarrage gratuit possible : Gemini Flash via clé Google AI Studio (free tier multimodal, PDF/images en entrée, quota journalier large)** — caveat : sur le free tier Google peut utiliser les données pour améliorer ses modèles (une confirmation de résa contient nom + référence ; jamais de document du coffre par ce canal). Alternatives free tier : Mistral La Plateforme, Groq. Bascule payante (Claude Haiku, ~centimes/mois) si le free tier gêne. En cas d'échec d'extraction, la saisie manuelle reste inchangée.
> Note : bouton "Importe-la" sur Nouvel événement → page `/events/import` (OWNER/EDITOR) : dépôt PDF ou 1-5 captures (4 Mo total, limite requête Vercel) → route `POST /api/trips/{id}/import-reservation` (aucune écriture) → **formulaire de relecture pré-rempli** (type, dates locales + fuseau — extrait si IANA valide, sinon celui du voyage —, trajet/lieu, mode, compagnie, référence, notes) → à la confirmation : événement créé + **la confirmation rangée en document TRIP** (catégorie billet/hébergement) attaché à l'événement, géocodage N01. Extraction `lib/import/reservation.ts` : Gemini REST (`GEMINI_MODEL`, défaut gemini-2.5-flash), JSON forcé, Zod tolérant (`catch`), consigne "jamais deviner une date absente → null". Sans `GEMINI_API_KEY` (ajoutée à `.env.example`) : page affiche "non configuré", reste de l'app intact. **À faire côté Yves : créer la clé AI Studio et la poser en local + Vercel, puis test réel avec une vraie confirmation.** Écart : plusieurs captures analysées ensemble mais seul le premier fichier est attaché en document.

### [x] PHIL-O02 — Météo du voyage (Open-Meteo) *(fait le 2026-07-04)*
API Open-Meteo (gratuite, sans clé, usage non commercial, prévisions ~16 jours) : encart météo de la semaine sur la page du voyage (coordonnées de la destination, géocodage N01), et météo du jour dans la vue jour + le mode Aujourd'hui (min/max, précipitations, icône). Cas d'usage : jeudi soir, je regarde la météo de vendredi.
> Note : colonnes `destination_lat/lng` sur `trips` (géocodées à la création et à l'édition du voyage, backfill best-effort au premier affichage via `ensureTripCoords`). `lib/weather/open-meteo.ts` : prévisions 16 jours dans le fuseau du voyage, cache Next 1 h, mapping WMO → libellés FR + icônes lucide, `isRainy()` prêt pour O03 ; tout échec réseau rend simplement la météo absente. UI : `WeatherStrip` (7 premiers jours du voyage couverts par la prévision, ☂ si ≥ 30 %) sur le calendrier, `WeatherLine` dans le hero Aujourd'hui et la vue jour. Test réel de l'appel Open-Meteo à faire en ligne (curl refusé en sandbox).

### [x] PHIL-O03 — Alerte météo de la veille au soir *(fait le 2026-07-04)*
Pour un voyage en cours : si la météo de demain annonce de la pluie (seuil à définir) sur le lieu du voyage → notification push la veille au soir. Contrainte : les 2 slots cron Hobby sont pris (6h expiry, 16h reminders) et un cron Hobby ne tourne qu'une fois par jour → greffer la vérification au cron `event-reminders` existant, éventuellement décalé de 16h à 18h UTC (20h Paris l'été) — à trancher au ticket. Approximation de fuseau assumée et documentée (le "20h local" exact dépend de la destination).
> Note : greffée au cron 16h UTC existant, **sans décalage** (16h UTC = 18h Paris l'été et 20h à Maurice — décaler pénaliserait les destinations à l'est). Seuil : `isRainy(code WMO)` **ou** proba de précipitations ≥ 60 % pour demain (jour local de la destination). Push à tout l'équipage des voyages en cours, clic → vue jour de demain. Nouvelle préférence `weather_alerts` (défaut activé, `.default(true)` pour les JSONB antérieurs — 4e interrupteur au profil automatique). Vérifié en local : 401 sans secret, 200 avec (0 voyage en cours — démo en novembre) ; contrat Open-Meteo validé en réel (16 jours, demain Maurice code 53, 92 % pluie → alerte déclenchée).

### [x] PHIL-O04 — Notes sous les événements *(fait le 2026-07-04)*
Fil de notes sous chaque événement ("le resto est fermé le lundi", "RDV plutôt à l'entrée sud") : auteur, date, suppression par l'auteur ou l'OWNER. Ce n'est **pas un chat** — la discussion de groupe reste sur WhatsApp (O06).
> Note : table `event_notes` (body 1-1000 car., RLS : lecture équipage via `private.event_trip_id`, insert membre en son nom, delete auteur ou OWNER, pas d'update — pas un chat). Section "Notes de l'équipage" sur la fiche événement : fil chronologique (auteur, date, corbeille si droit), textarea inline avec reset après envoi. `verify:rls` 30/30.

### [x] PHIL-O05 — "À emporter" par activité *(fait le 2026-07-04)*
Sur un événement (surtout ACTIVITY) : liste des choses à prendre ("snorkeling → maillot, serviette, crème solaire"). Piste : réutiliser `checklist_items` avec un `event_id` optionnel — items visibles sur la fiche événement ET dans la section "à emporter" de la Valise (O08). Bonus à évaluer : le rappel J-1 (N08) mentionne les items non cochés.
> Note : `checklist_items.event_id` (nullable, cascade, RLS existante par trip_id inchangée). Section "À emporter" sur la fiche événement (tous types) : coche, ajout inline (section `a_emporter`), suppression — mêmes server actions que la Valise, étendues d'un `eventId` optionnel pour revalider la fiche. Dans la Valise, les items rattachés portent un badge laiton avec le titre de l'événement. **Écart** : le rappel J-1 ne mentionne pas les items non cochés (bonus non retenu, à re-proposer si besoin).

### [x] PHIL-O06 — WhatsApp : profil et groupe du voyage *(fait le 2026-07-04)*
1. Sur le profil : numéro de téléphone et/ou username WhatsApp (nouveauté WhatsApp ~2025) → lien wa.me sur les cartes participants et les fiches d'urgence (N06).
2. Sur le voyage : champ "lien du groupe WhatsApp" (`chat.whatsapp.com/…`) affiché en bonne place (en-tête du voyage ou onglet participants).
> Note : colonne `profiles.whatsapp` (un seul champ : numéro **ou** @pseudo, ≤ 50 car., visible des co-voyageurs via la policy existante) + `trips.whatsapp_group_url` (check `chat.whatsapp.com/…` en base). `waContactLink()` : un numéro donne un lien wa.me cliquable ; un @pseudo s'affiche sans lien (pas de format d'URL public officiel stable pour les usernames). UI : champ au profil, champ Paramètres du voyage (OWNER/EDITOR), bouton "Groupe WhatsApp du voyage" + contact sous chaque participant (page Participants), ligne WhatsApp sur les fiches d'urgence. `verify:rls` 30/30.

### [x] PHIL-O07 — Lien opérateur sur les transports *(fait le 2026-07-04)*
Champ URL optionnel sur les événements TRANSPORT : lien vers l'app/le site de la compagnie (statut du vol, du train). Remplace le suivi de vol intégré, écarté (AeroAPI payant, AviationStack ~100 req/mois en gratuit). À trancher au ticket : champ URL générique sur **tous** les événements (resto → lien réservation) plutôt que TRANSPORT seul.
> Note : **généralisé aux trois types** — `metadata.external_url` existait déjà (affiché "Lien externe" sur la fiche, saisi seulement pour ACTIVITY) ; ajouté aux formulaires TRANSPORT ("Lien compagnie") et LODGING ("Lien de la réservation"), et au formulaire d'édition commun (merge JSONB sans écraser les autres clés metadata ; champ vidé = lien supprimé). Aucune migration nécessaire.

### [x] PHIL-O08 — Renommer la Checklist en "Valise" *(fait le 2026-07-04)*
Renommage produit : onglet, titres, microcopy, templates N03. Les sections restent (avant le départ / à emporter / sur place). Vérifier que "Valise" reste juste pour les items non-bagage ("réserver le taxi") — sinon un titre du type "Valise & to-do".
> Note : l'onglet était la seule occurrence visible de "Checklist" (la page n'a pas de titre propre, les templates n'en parlent pas). Onglet → **Valise** ; les libellés de sections couvrent déjà les items non-bagage, pas besoin de "Valise & to-do". Route `/checklist` et table inchangées (technique).

### [x] PHIL-O09 — Catégories de dépenses et suivi (deux vues distinctes) *(fait le 2026-07-04)*
Colonne `category` sur `expenses` (transport / logement / activité / resto / courses / autre) + exposer dans le formulaire le `event_id` déjà prêt en base (une dépense liée à un événement hérite de sa catégorie et de son contexte — adresses et liens des logements vivent déjà sur les événements LODGING). Le Budget devient **deux parties distinctes** (décision du 2026-07-04) :
1. **Équilibre** (le "tricount", existant N09) : qui a payé quoi, soldes, règlements simplifiés.
2. **Suivi des dépenses** (nouvelle page/onglet) : répartition par catégorie, avec deux lectures — **le voyage au global** (toutes les dépenses) et **mes dépenses** (ma part : ce que j'ai payé et ce dont je suis bénéficiaire) — et la timeline avant / pendant / après le voyage (date de la dépense vs dates du voyage).
> Note : colonnes `category` (check en base, défaut `autre`) et **`spent_on`** (date de la dépense — `created_at` ne dit que la date de saisie ; défaut aujourd'hui, champ Date au formulaire). Formulaire : sélecteur de catégorie, événement lié (le choisir **pré-remplit la catégorie** selon le type — modifiable), date. Deux vues navigables par pills : `/budget` (Équilibre, inchangé + chip catégorie sur chaque dépense) et `/budget/depenses` (Suivi) : barres par catégorie et par phase avant/pendant/après, en double lecture "Le voyage" (totaux) et "Mes dépenses" (ma part = montant/nb bénéficiaires si j'en suis, + total avancé), par devise sans conversion comme N09.

### [x] PHIL-O10 — Galerie photos du voyage (quota strict) *(fait le 2026-07-04)*
Photos partagées par voyage, rattachables à un événement ou à un jour. **Qualité d'origine conservée, nombre limité** (décision Yves — plutôt que compresser pour en mettre plus) : Supabase Free = 1 Go de storage total, à ~3-4 Mo la photo de téléphone ça fait ~250-300 photos maximum tous voyages confondus, documents inclus. Proposition : **quota de 40 photos par voyage** (~150 Mo) via constante ajustable + jauge de stockage global visible.
**Vignettes** : générer une miniature côté client à l'upload (canvas, ~100-200 Ko) — la grille charge les vignettes, l'original ne se télécharge qu'à l'ouverture (la transformation d'images Supabase est réservée aux plans payants, donc génération client). **Voyage démo** : photos en basse qualité uniquement, pour ne pas entamer le quota réel. Base du futur carnet/PDF souvenir (backlog).
> Note : table `trip_photos` (RLS : lecture équipage, ajout membre en son nom, suppression auteur/OWNER) + bucket privé `photos` (10 Mo max, JPEG/PNG/WebP, insert dans son dossier seulement, lecture service-role uniquement). Upload client (multi-fichiers, légende + événement optionnels appliqués au lot) : original + vignette canvas 480 px JPEG 0.72, enregistrement via server action qui **vérifie le chemin et le quota (40/voyage, `PHOTOS_PER_TRIP`) et purge les blobs en cas de refus**. Lecture via `/api/photos/{id}/view` (`?thumb=1`), cache privé 1 h. Onglet **Photos** : compteur x/40 + Mo utilisés, grille de vignettes lazy, original au clic, corbeille au survol. **Écarts** : jauge = par voyage (pas de jauge globale 1 Go — nécessiterait le service role sur toute l'app) ; photos démo basse qualité à faire au prochain passage sur le seed démo ; HEIC non accepté (l'iPhone convertit en JPEG à la sélection). `verify:rls` 30/30.

---

## Catégorie P — Vague 4 (arbitrée avec Yves le 2026-07-04, complétée le soir même : "rajoute tout")

Ordre de réalisation : P04 → P01 → P05 → P07 → P06 → P08 → P09 → P13 → P11 → P12 → P02 → P03 → P10.
(petits gains d'abord ; P02/P03 en fin car plus lourds ; P10 en dernier, le moins urgent)

### [x] PHIL-P01 — Devises : conversion et double affichage *(fait le 2026-07-04)*
Chaque voyage a une devise **principale** et une devise **secondaire** (choisies dans les Paramètres ; défauts proposés : EUR + devise de la destination). Tout montant du budget s'affiche **dans les deux : la principale en gros, la secondaire en petit dessous**. Conversion via une API de taux gratuite sans clé (Frankfurter, taux BCE, cache quotidien). Conséquence : les soldes et règlements du tricount (N09) et le Suivi (O09) deviennent **unifiés dans la devise principale** (conversion à l'affichage, les montants saisis restent stockés dans leur devise d'origine). Décision Yves du 2026-07-04 : important.
> Note : **open.er-api.com** au lieu de Frankfurter (les taux BCE n'ont pas la roupie mauricienne ; er-api = 166 devises, gratuit sans clé, validé en réel : MUR 53,77/EUR) — cache Next 12 h, échec réseau = retour à l'affichage par devise d'origine. Colonnes `currency_primary` (défaut EUR) / `currency_secondary` (nullable) + champs Paramètres (saisie code ISO 3 lettres). Composant `Money` (principale en gros, "≈ secondaire" en petit dessous) appliqué : total, règlements, lignes de dépense (montant saisi en tooltip si devise différente) ; soldes unifiés dans un groupe "devises converties", devises sans taux en sections séparées comme avant. Suivi (O09) converti aussi. **Écart** : la ligne de solde par personne (payé/part/net) reste en principale seule (6 nombres sinon) ; la devise secondaire par défaut n'est pas déduite de la destination (saisie manuelle).

### [x] PHIL-P02 — Import de réservation par email *(fait le 2026-07-04 — réception effective quand un domaine sera configuré)*
La v2 de O01 : transférer l'email de confirmation à une adresse Phil → événement pré-rempli (même pipeline d'extraction Gemini). Boîte entrante gratuite : **Resend inbound** ou **Cloudflare Email Routing** (webhook vers l'app). Rattachement au voyage : **alias par voyage** (ex. `maurice-x7f2@…`, affiché dans les Paramètres) plutôt que déduction par dates. Sécurité : n'accepter que les emails dont l'expéditeur correspond à un participant du voyage ; l'événement arrive en "à valider" (pas de création silencieuse). Le PDF/corps de l'email est rangé en document du voyage comme dans O01.
> Note : pipeline complet livré, **la réception attend un domaine** (MX Resend inbound ou Cloudflare Email Routing → POST `/api/inbound-email?secret=INBOUND_EMAIL_SECRET` — sans secret configuré la route répond 401, comportement sûr par défaut). Alias par voyage : carte "Import par email" dans les Paramètres (génération `nom-du-voyage-xxxx`, unique, check en base), domaine affiché via `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN`. Webhook : payload tolérant (Resend/Cloudflare), expéditeur vérifié contre les emails `auth.users` des participants (réponse identique alias inconnu/étranger — pas de fuite), extraction Gemini sur la 1re pièce jointe exploitable **ou le texte de l'email**, pièce jointe stockée dans `documents/inbound/` (service-role only), brouillon en table `import_drafts` (RLS lecture/traitement OWNER/EDITOR, insert service-role uniquement). Page Importer : encart "Reçues par email — à valider (n)" → même formulaire de relecture (mode brouillon : pas d'upload, la pièce jointe est copiée vers mes documents à la validation, brouillon DONE) + bouton Écarter (purge du blob). `.env.example` complété. **Écart** : pas de push à la réception d'un brouillon (à raccrocher à N07 si besoin). `verify:rls` 30/30.

### [x] PHIL-P03 — Partage public d'un voyage en lecture seule (façon Polarsteps) *(fait le 2026-07-04)*
Lien public révocable (token, activable par l'OWNER dans les Paramètres) vers une page **sans authentification** montrant uniquement : nom, destination, dates, **itinéraire jour par jour** et **carte** du voyage. **Jamais** : documents, budget, fiches d'urgence, notes d'équipage, participants (prénoms à trancher). Photos : désactivées par défaut, interrupteur "inclure les photos" — à trancher au ticket. Attention à la route : rendu via un layout public (pas le layout authentifié), token en RLS ou lecture service-role filtrée.
> Note : `trips.public_token` (uuid unique, null = désactivé), carte "Partage public" dans les Paramètres (**OWNER only**, vérifié dans l'action) : créer/copier/révoquer. Page `/p/{token}` **hors du layout authentifié** (préfixe ajouté aux routes publiques du middleware, comme `/api/inbound-email` au passage) : lecture **service-role filtrée ici** (aucune policy anonyme ouverte) — en-tête, carte OSM avec pions et tracé (réutilise TripMapLazy N01, sans liens vers les fiches), itinéraire jour par jour (titre, heure, lieu — pas de notes), pied "Partagé avec Phil". **Décisions** : photos exclues (pas d'interrupteur v1), prénoms des participants exclus. **Vérifié en réel** : page anonyme 200 avec contenu, token invalide 404, révocation → 404.

### [x] PHIL-P04 — Marquer les remboursements du tricount *(fait le 2026-07-04)*
Le tricount calcule "Yves doit 42 € à Amelie" mais rien ne permet de dire "c'est réglé" : bouton **"Marquer comme réglé"** sur chaque règlement suggéré → enregistre un remboursement (transaction payée par le débiteur au seul bénéfice du créancier, flag `is_settlement`), ce qui remet les soldes à zéro naturellement. Les remboursements sont exclus du Suivi par catégories (ce n'est pas une dépense) et affichés à part dans la liste ("↩ Remboursement").
> Note : colonne `expenses.is_settlement` (défaut false), action `markSettled` (insert "Remboursement" payé par le débiteur, bénéficiaire unique = créancier — la math de `computeBalances` remet les nets à zéro sans cas particulier). Liste : "↩ Remboursement · X → Y", badge "entre voyageurs" ; le **total** par devise et le Suivi excluent les remboursements. Tout membre peut marquer un règlement (RLS N09 inchangée) ; suppression possible comme toute transaction si erreur.

### [x] PHIL-P05 — Temps de trajet entre les événements d'une journée *(fait le 2026-07-04)*
Dans la vue jour et le mode Aujourd'hui : afficher "≈ 35 min de route" entre deux événements consécutifs géolocalisés. API OSRM publique (gratuite, même écosystème qu'OSM/Nominatim déjà utilisés), profil voiture en v1, cache 1 h, best-effort (pas de coordonnées → pas d'affichage).
> Note : `lib/geo/travel-time.ts` (OSRM `router.project-osrm.org`, profil voiture, cache Next 24 h par paire, timeout 3 s, null jamais bloquant ; validé en réel : Flic-en-Flac → Port Louis ≈ 37 min). Vue jour : encart "Trajets de la journée (en voiture)" sous le titre (la grille horaire absolue se prête mal à des puces intercalées). Hero Aujourd'hui : "· ≈ X min de route" sur la carte Prochain départ (depuis l'événement en cours). Trajets < 3 min masqués (même lieu).

### [x] PHIL-P06 — Valise intelligente (suggestions météo + activités) *(fait le 2026-07-04)*
Sur la page Valise : encart "Phil te souffle" avec des suggestions contextuelles à ajouter en un tap — règles locales simples, sans LLM : météo du voyage (pluie → k-way, ≥ 28° → crème solaire, ≤ 5° → bonnet), mots-clés des activités planifiées (snorkeling/plongée → maillot, rando → chaussures), durée du séjour. Dédupliquées contre les items déjà présents.
> Note : `lib/trips/packing-suggestions.ts` — règles météo (pluie/chaleur/soleil/froid sur les jours du voyage couverts par la prévision), 5 familles d'activités par regex sur les titres d'événements (eau, marche, mer, neige, vélo), ≥ 7 nuits → lessive ; déduplication insensible aux accents et par inclusion ("crème solaire" existante masque la suggestion). Encart "Phil te souffle…" en tête de la Valise : puces "+ item" (raison en tooltip) → ajout direct en "À emporter". Logique vérifiée par test (7 suggestions attendues, doublon écarté).

### [x] PHIL-P07 — Autocomplétion de lieu à la saisie *(fait le 2026-07-04)*
Composant `PlaceInput` réutilisable (formulaires activité, hébergement, édition, idées) : recherche de lieu avec suggestions (Photon/komoot, gratuit, basé OSM) via une route proxy `/api/geo/search` (CSP oblige), sélection → adresse + coordonnées propres stockées directement (fiabilise la carte N01 et les temps de trajet P05 ; le géocodage Nominatim best-effort reste le fallback si saisie libre).
> Note : proxy authentifié (pas de relais public), cache 24 h, ≥ 3 caractères, debounce 350 ms, validé en réel sur Photon ("flic en flac" → 3 résultats). Branché sur : lieu d'activité, **nom d'hébergement** (la sélection remplit aussi le champ adresse), lieu d'idée — la sélection pose `location_lat/lng` directement et court-circuite Nominatim ; toute modification manuelle du texte invalide les coordonnées (re-géocodage serveur). **Écart** : pas branché sur le formulaire d'édition (champ lieu simple conservé — le re-géocodage à l'édition couvre le besoin) ni sur les champs from/to des transports (texte libre voulu).

### [x] PHIL-P08 — Journal de bord par jour *(fait le 2026-07-04)*
Pendant (ou après) le voyage : quelques lignes par jour et par voyageur, visibles de l'équipage — section "Journal de bord" dans la vue jour. Table `journal_entries` (trip, jour, auteur, texte). C'est la matière première du futur PDF souvenir (backlog).
> Note : PK (trip, jour, auteur) = **une entrée par personne et par jour, modifiable** (upsert) et effaçable par son auteur ; RLS lecture équipage / écriture own. Section en pied de vue jour : entrées des autres en cartes, la mienne dans un textarea pré-rempli ("Écrire dans le journal" / "Mettre à jour mon entrée"). `verify:rls` 30/30.

### [x] PHIL-P09 — Stats de l'explorateur *(fait le 2026-07-04)*
Page personnelle "Explorateur" : nombre de voyages, jours en voyage, pays visités, activités faites, km parcourus (haversine entre événements géolocalisés consécutifs), photos. Ton Jules Verne assumé ("tu as bouclé 0,8 tour du monde"). Sert de socle aux badges P12 et héberge la carte P13.
> Note : page `/explorer` (lien depuis le Profil) — 8 tuiles : voyages au carnet / bouclés, jours de voyage (planifiés compris), destinations distinctes, activités, **km à vol d'oiseau** (haversine entre étapes géolocalisées consécutives, par voyage, `lib/geo/distance.ts`), photos, pages de journal. Accroche "% d'un tour du monde (40 075 km)". Tout passe par la RLS (mes voyages seulement), aucun schéma ajouté. Les **pays visités** arrivent avec P13 (la tuile "destinations" compte les destinations textuelles distinctes en attendant) et les badges avec P12.

### [x] PHIL-P10 — Ordre de visite suggéré pour une journée *(fait le 2026-07-04)*
Sur la vue jour (si ≥ 3 activités géolocalisées sans horaires contraints) : suggestion d'un ordre de visite qui minimise les trajets (plus proche voisin depuis l'hébergement, pas de vrai TSP). Affichage indicatif, ne modifie rien tout seul. Le moins prioritaire de la vague — à faire en dernier.
> Note : `lib/geo/visit-order.ts` (plus proche voisin depuis l'hébergement couvrant le jour, haversine). Encart "Ordre de visite malin (indicatif)" sur la vue jour, affiché **seulement si le gain est réel** (> 15 % et > 2 km) et l'ordre différent du chronologique — sinon silence. Vérifié par test : nord/sud/nord → réordonné 160 km → 82 km ; ordre déjà bon → pas de suggestion.

### [x] PHIL-P11 — Gamification : analyse *(fait le 2026-07-04)*
Analyser sur quoi gamifier Phil sans le dénaturer (cercle d'amis, pas de leaderboard agressif) : axes candidats — pays visités, voyages bouclés, activités, km, photos, contribution au groupe (idées proposées, votes, checklist cochée, fiche d'urgence remplie, docs prêts avant J-7), assiduité du journal. Livrable : le catalogue de badges (noms Jules Verne, seuils, icônes) et les règles, documenté dans la note du ticket → alimente P12 directement.
> Note — **analyse et décisions** :
> **Principes retenus** : (1) badges **personnels et positifs** — on célèbre l'exploration et la contribution au groupe, jamais la comparaison ; (2) calcul **à la volée** depuis les données existantes (zéro table de progression, zéro trigger — un badge reflète toujours l'état réel) ; (3) v1 **sans notification** de déblocage (pas de spam ; à reconsidérer si demandé) ; (4) tout badge affiche sa **progression** (12/20) pour donner envie sans frustrer.
> **Écartés volontairement** : leaderboard entre amis (contraire à l'esprit Phil), streaks/assiduité (pression), badges liés aux montants dépensés (malaisant en groupe), succès secrets (frustrant à 10 utilisateurs).
> **Catalogue (14 badges, esprit Verne)** — Exploration : *Premier pas* (1 voyage au carnet), *Globe-trotteur* (3 voyages bouclés), *Phileas* (80 jours de voyage cumulés), *Cinq semaines en ballon* (5 000 km à vol d'oiseau), *Le tour du monde* (40 075 km), *Passeport tamponné* (5 pays visités), *Mappemonde* (15 pays). Contribution : *Passepartout* (15 items de Valise ajoutés — l'intendant fidèle), *Éclaireur* (10 idées proposées), *La voix de l'équipage* (15 votes : idées + sondages + candidats), *Précaution de Fogg* (fiche d'urgence remplie), *Archiviste* (10 documents déposés). Mémoire : *Chroniqueur de bord* (5 pages de journal), *Daguerréotypiste* (20 photos partagées).

### [x] PHIL-P12 — Gamification : badges à débloquer *(fait le 2026-07-04)*
Implémentation du catalogue P11 : badges calculés depuis les données existantes (pas de table de progression en v1 — calcul à l'affichage), grille débloqués/verrouillés sur la page Explorateur (P09), noms et visuels esprit Verne ("Passepartout" checklist 100 %, "Tour du monde" X pays…).
> Note : `lib/gamification/badges.ts` (14 badges du catalogue P11, pur — testable), compteurs personnels par count RLS (items de Valise, idées, votes idée+sondage+candidat, fiches d'urgence, documents, photos uploadées par moi). Section "Médailles de l'explorateur (x/14)" sous la mappemonde : débloqués en carte laiton, verrouillés estompés **avec progression (12/20)**. Aucune migration, aucune notification (décision P11).

### [x] PHIL-P14 — Liens cliquables dans les descriptions et notes *(fait le 2026-07-04)*
Demande Yves (2026-07-04, soir) : pouvoir mettre des liens dans la description d'une activité. Le champ "Lien externe" dédié existe (O07) mais un URL collé dans les notes/description reste du texte mort → rendre cliquable tout `https://…` dans : les notes d'un événement (fiche), les notes de l'équipage (O04), la description d'une idée. Composant `Linkify` (découpage par regex, pas de HTML injecté, `rel="noopener noreferrer"`).
> Note : `components/ui/linkify.tsx` (split par regex + rendu React — aucun `dangerouslySetInnerHTML`), branché sur les 3 surfaces prévues. Les autres textes libres (journal, légendes photos…) restent en texte simple — extension triviale si le besoin vient.

### [x] PHIL-P13 — Carte des pays visités *(fait le 2026-07-04)*
Page (dans l'Explorateur P09) avec une **carte du monde** : pays **déjà visités en couleur** (palette Phil — plusieurs teintes possibles, ex. par période ou aléatoire stable), les autres en **beige parchemin** ("à visiter"). Fond de carte : GeoJSON Natural Earth 110m embarqué dans le repo (pas de CDN), rendu Leaflet existant. Alimentation : clic sur un pays pour le marquer visité/non visité + suggestion automatique depuis les destinations géocodées des voyages passés. Table `visited_countries` (user, code pays).
> Note : **Natural Earth 50m** (le 110m n'a pas Maurice !) — 242 pays, réduit à 1,4 Mo (propriétés `{code ADM0_A3, name FR}`, coordonnées arrondies à 0,01°) dans `public/geo/countries.geojson`, chargé uniquement sur l'Explorateur. Carte Leaflet **sans tuiles** (fond parchemin uni, cohérent avec le thème), tooltip au survol, clic = toggle optimiste + action serveur ; 4 teintes Phil (bordeaux/laiton/encre/vert wagon) par hachage stable du code pays, non-visités en beige. Table `visited_countries` (PK user+code, RLS strictement own). Suggestions "D'après tes voyages" : **point-dans-polygone maison** (`lib/geo/country-lookup.ts`, zéro réseau, validé : Maurice/France/océan) sur les destinations géocodées des voyages passés. Tuile "pays visités" ajoutée aux stats. `verify:rls` 30/30.

---

## Catégorie Q — Vague 5 (arbitrée avec Yves le 2026-07-04, soir — "fais-le")

Ordre : Q06 → Q04 → Q05 → Q02 → Q03 → Q01. Écartés volontairement : drag & drop idées→calendrier (gros chantier, gain incertain vu la planification en groupe), bottom-bar mobile (session design dédiée), import Google Maps (pas d'API propre).

### [x] PHIL-Q01 — Ajout rapide d'événement *(fait le 2026-07-04)*
Le geste le plus fréquent de l'app doit être le plus court (standard TripIt/Wanderlog) : sur le calendrier du voyage, un champ "Ajout rapide" — titre + jour (+ heure optionnelle, défaut 12h) → crée une ACTIVITY enrichissable ensuite via la fiche/l'édition. Les formulaires complets restent pour les cas riches.
> Note : barre inline ⚡ sous les boutons du calendrier (OWNER/EDITOR) — titre + jour (défaut : aujourd'hui si voyage en cours, sinon le départ) + heure optionnelle (défaut 12h), création ACTIVITY dans le fuseau du voyage, reset après ajout. Pas de géocodage (pas de lieu saisi) — l'édition l'ajoutera. Les formulaires complets restent inchangés.

### [x] PHIL-Q02 — Visionneuse photos (lightbox) *(fait le 2026-07-04)*
Taper une photo ouvre une visionneuse plein écran (original) avec précédent/suivant, clavier (←/→/Échap) et fermeture au tap — au lieu de l'ouverture brute dans un nouvel onglet.
> Note : overlay encre 95 % — compteur x/n + auteur en tête, flèches ‹ › (bouclage), ←/→/Échap au clavier, clic sur le fond = fermer, légende en pied. L'original ne se charge que dans la visionneuse (la grille reste sur les vignettes).

### [x] PHIL-Q03 — Temps réel sur les votes et sondages *(fait le 2026-07-04)*
Supabase Realtime (free tier) : les sondages éclair, votes d'idées et dépenses se mettent à jour sans recharger. Migration : ajouter `polls`, `poll_votes`, `idea_votes`, `expenses` à la publication realtime (RLS appliquée par WALRUS — on ne reçoit que ce qu'on a le droit de voir). Composant `RealtimeRefresh` (channel + router.refresh() débouncé) posé sur les pages Idées et Budget.
> Note : 5 tables ajoutées à la publication (`expense_beneficiaries` incluse). `RealtimeRefresh` invisible, `router.refresh()` débouncé 400 ms, désabonnement au démontage ; échec de connexion = comportement d'avant (rechargement manuel), jamais bloquant. Test réel à deux navigateurs à faire en prod (le SW/dev ne s'y prête pas). `verify:rls` 30/30.

### [x] PHIL-Q04 — Sélecteur de devise *(fait le 2026-07-04)*
Remplacer les champs texte libres "EUR" par un input avec datalist des devises courantes (code + libellé, saisie libre toujours possible) — Paramètres du voyage (principale/secondaire) et formulaire de dépense.
> Note : `CurrencyInput` (datalist de 40 devises courantes avec libellés FR, `useId` pour éviter les collisions de datalist, saisie libre ISO conservée + validation Zod inchangée). Branché sur les 3 champs prévus.

### [x] PHIL-Q05 — Export CSV du budget *(fait le 2026-07-04)*
Bouton "Exporter (CSV)" sur l'onglet Budget : titre, montant, devise, montant converti, catégorie, payeur, bénéficiaires, date, remboursement — généré côté client depuis les données affichées.
> Note : génération 100 % client (Blob + download `budget-phil.csv`), séparateur `;` + BOM UTF-8 + décimales à virgule pour Excel FR, montants convertis en devise principale inclus, noms réels (pas "Toi"). `spent_on` remonté au client au passage.

### [x] PHIL-Q07 — Accueil : redirection au lieu de la page placeholder *(fait le 2026-07-04)*
La racine `/` affichait encore le splash de la phase 1 ("bientôt prêt à partir"). Demande Yves : connecté → `/trips`, sinon → `/login`.
> Note : `redirect()` côté serveur, plus aucune page intermédiaire.

### [x] PHIL-Q08 — Seed démo complet (Maurice novembre 2026) *(fait le 2026-07-04)*
Peupler le voyage démo avec le vrai séjour (5→21 nov, Tamarin puis Blue Bay) : 7 nouveaux comptes démo (Alexandre, Audrey, Adé, Mathieu, Quentin, Chloé, Julie), vol Julie & Quentin le 6 nov 9h, activités piochées dans le guide Maurice d'Yves (yallah/activites-maurice.md), et des données dans **toutes** les fonctionnalités : idées + votes, sondages, candidats + avis, valise (+ à-emporter), budget multi-devises + remboursement, journal, notes, fiches d'urgence, documents PDF, photos basse qualité, brouillon d'import email, WhatsApp. Script `scripts/seed-demo-maurice.ts` (service role, réinitialise les données du voyage démo uniquement).
> Note : **exécuté avec succès** — 9 participants (7 comptes créés, EDITOR), 20 événements géocodés (2 vols aller dont Julie & Quentin arrivée 6 nov 9h avec `event_participants`, 2 villas, 15 activités du guide avec notes/prix/liens, vol retour), 7 idées votées, 2 sondages, 3 candidats Blue Bay (retenu→événement / en lice / écarté) avec avis pondérés et citations, 12 items de valise (4 rattachés snorkeling/Morne), 10 transactions budget (EUR+MUR, catégories, dépense liée au catamaran, remboursement réglé), 3 pages de journal, 3 notes d'équipage, 3 fiches d'urgence, 3 PDF générés par pdf-lib et attachés, 6 photos picsum basse qualité (vignettes incluses), 1 brouillon d'import email PENDING (testable sans clé Gemini !), 6 pays visités, WhatsApp profils + groupe, devises EUR/MUR. Relançable (purge et régénère les données du voyage démo uniquement).

### [x] PHIL-Q09 — Documentation complète des fonctionnalités *(fait le 2026-07-04)*
`docs/FONCTIONNALITES.md` : toutes les fonctionnalités par catégorie, à jour des vagues 1 à 5.
> Note : 17 catégories (comptes, voyages/équipage, calendrier, imports, coffre, documents, idées/décisions, valise, budget, photos, journal/souvenirs, cartes, météo, notifications, partage extérieur, offline, sécurité) + tableau des configurations en attente (🔑) + comptes de démo. À maintenir au fil des tickets.

### [x] PHIL-Q10 — Valise : garde-robe type avec quantités *(fait le 2026-07-04)*
Demande Yves (2026-07-04) : proposer les affaires qu'on retrouve dans tous les voyages (t-shirts, pantalons, shorts, maillots, brosse à dents, lunettes de soleil, crème solaire…), **rangées par catégorie** (vêtements, trousse de toilette, indispensables…), **avec des quantités** (calculées d'après la durée du séjour, ajustables). Les items non sélectionnés restent "à sélectionner" avec un bouton **+ Ajouter** ; les items déjà dans la valise ont un bouton **Retirer**.
> Note : `lib/trips/packing-catalog.ts` — 26 items en 4 catégories (Vêtements, Chaussures, Trousse de toilette, Indispensables), quantités fonction des nuits (t-shirts ≈ nuits plafonné à 10, sous-vêtements nuits+1, etc.), champ quantité modifiable avant l'ajout. Panneau repliable "Garde-robe type (x/26)" en tête de la Valise : pending en pointillé + "+ Ajouter", sélectionnés en laiton avec ✓ et "Retirer" ; l'ajout crée un item "T-shirts ×12" en "À emporter" (correspondance insensible aux accents et au suffixe ×n). Aucune migration.

### [x] PHIL-Q11 — La carte devient un onglet du voyage *(fait le 2026-07-04)*
La carte (N01) existe mais n'est accessible que par un bouton sur le calendrier — demande Yves : l'ajouter aux onglets du voyage.
> Note : onglet **Carte** en 2e position (après Calendrier), bouton redondant du calendrier retiré (Timeline conservé). La page carte existante (Programme/Idées, filtre par jour) est inchangée.

### [x] PHIL-Q13 — Liens "Itinéraire" Google Maps sur les trajets *(fait le 2026-07-04)*
Demande Yves (2026-07-04) : à côté des distances, un lien qui ouvre l'app de conduite (Google Maps retenu — ses liens universels ouvrent l'app native sur mobile). Sur : chaque trajet de la vue jour (origine → destination en coordonnées) et le Prochain départ du mode Aujourd'hui (destination seule → Google part de la position actuelle). La fiche événement avait déjà son bouton Itinéraire.
> Note : `lib/geo/directions.ts` (`directionsUrl` origine→destination, `navigateUrl` destination seule, `travelmode=driving`, coordonnées à 6 décimales). Vue jour : lien "🧭 Itinéraire" sur chaque trajet. Mode Aujourd'hui : bouton **"Y aller"** bordeaux sur la carte Prochain départ (coordonnées si géocodé, sinon adresse texte). Le bouton Itinéraire de la fiche événement utilise désormais les coordonnées précises quand elles existent. Waze écarté (préférence Yves : Google Maps ; ses liens s'ouvrent dans l'app installée).

### [x] PHIL-Q27 — Valise : onglets, catégories, sélection ligne à ligne *(fait le 2026-07-05)*
Retours Yves (2026-07-05) : supprimer le bloc "Phil te souffle" ; **3 onglets** (À emporter / Avant le départ / Sur place) ; dans chaque onglet, **la liste** (items sélectionnés) puis en dessous **ce qu'on peut encore sélectionner**, chaque objet **sur sa propre ligne** avec bouton Ajouter/Supprimer ; plus de préfixe "À sélectionner —", juste le nom de la **catégorie** ; items groupés par catégorie ; pouvoir **ajouter ses éléments** dans n'importe quel onglet **et créer ses catégories** (colonne `category` sur les items).
> Note : colonne `checklist_items.category` (≤ 40 car., libre) ; client réécrit — onglets pilules, liste groupée par catégorie (Divers en dernier), lignes avec case/échéance/badge événement/assignation/corbeille ; catalogue "Encore à sélectionner" ligne à ligne avec quantité ajustable + bouton Ajouter (la catégorie du catalogue suit l'item) ; formulaire d'ajout avec champ catégorie libre (datalist) ; bloc "Phil te souffle" supprimé, `catalog-rows.tsx` supprimé.

### [x] PHIL-Q28 — Voyageurs triés par ordre alphabétique *(fait le 2026-07-05)*
Partout où l'équipage est listé (participants, sélecteurs d'assignation, Bourse…).
> Note : tri `localeCompare("fr")` sur : page Participants, membres de la Bourse (Dépenses + Équilibre), inscrits d'un événement, assignation Valise.

### [x] PHIL-Q29 — Page Horloges transversale *(fait le 2026-07-05)*
Remplacer le bandeau du calendrier (Q24) par une **page Horloges** hors voyage : une horloge **par ligne** (chez soi + chaque destination de mes voyages), triées par **décalage par rapport à Greenwich croissant** (le plus petit en haut).
> Note : page `/horloges` (lien "Horloges" en tête de Tes voyages) — chez toi (encadré laiton, fuseau du profil) + une horloge par destination de voyage non archivé (dédup par fuseau), chaque ligne : grande heure, destination, jour + "UTC+4 · +3 h par rapport à chez toi", tick 15 s. Bandeau Q24 retiré du calendrier.

### [x] PHIL-Q30 — Fix : aperçu des documents du coffre bloqué par la CSP *(fait le 2026-07-05, livré dans le commit Q28)*
Retour Yves : viewer cassé malgré des PDF valides (diagnostic mené jusque dans Chrome : réponse 200 `application/pdf` correcte). Cause : `X-Frame-Options: DENY`, `frame-ancestors 'none'` et `object-src 'none'` (PHIL-J01) appliqués **à la réponse PDF elle-même** → Chrome refuse de l'afficher (iframe et pleine page). Fix : `/api/documents/:id/view` exclu de la CSP globale dans `next.config.ts`, avec ses propres headers (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `object-src 'self'`, nosniff).

## Audit sécurité & qualité (2026-07-05) — correctifs

### [x] PHIL-Q56 — Tests : couverture élargie + coverage + e2e en CI *(fait le 2026-07-05)*
Demande Yves : monter la note Tests (très important).
> Fix : 25 → **53 tests unitaires** — ajout de `datetime` (fuseaux : bascule de minuit Maurice UTC+4, jour selon fuseau), `rates` (conversion + aller-retour), `trip-status` (statuts + tri), catégories, liens Google Maps, `parsePreferences`, secrets (constant-time, `checkBearer`). **Couverture 90%** (stmts) sur la logique pure via `@vitest/coverage-v8`, **seuil 85% imposé** (`vitest.config.ts`). CI : `test:coverage` remplace `test`, et un **job e2e Playwright** (Chromium) tourne sur push/PR. Deux hypothèses fausses de mes tests corrigées au passage (catégorie `resto`, coords à 6 décimales) — c'est le rôle des tests.

### [x] PHIL-Q47 — Tests : CI qui impose lint + types + build + tests *(fait le 2026-07-05)*
Audit : la base de tests (25 unit + 8 e2e) n'était **imposée nulle part** — dérive garantie.
> Fix : `.github/workflows/ci.yml` — sur push/PR : pnpm install (frozen), `lint`, `type-check`, `build` (env factices), `test` (Vitest). Job `rls` séparé qui lance `verify:rls` dès que les secrets Supabase sont fournis au dépôt. E2e Playwright à ajouter quand un Supabase de test sera câblé.

### [x] PHIL-Q48 — Dépendances : Dependabot + version Node épinglée *(fait le 2026-07-05)*
Audit : pas de veille de vulnérabilités automatisée, version Node non épinglée.
> Fix : `.github/dependabot.yml` (npm + github-actions, hebdo, bumps mineurs groupés), `.nvmrc` (24) et `engines.node` (`>=22 <25`) dans package.json.

### [x] PHIL-Q55 — Offline : expiration 30 j + purge des voyages terminés *(fait le 2026-07-05)*
Demande Yves : limite de temps sur le cache offline + purge auto d'un voyage fini.
> Fix : `lib/offline/maintenance.ts` (`runOfflineMaintenance`, `purgeTripOffline`) — au chargement de l'app (via `OfflineAuthGuard`, best-effort) : les fichiers gardés offline **expirent à 30 jours**, et un **voyage terminé depuis plus de 7 jours** est entièrement purgé du cache (événements, docs, idées, fichiers, sync_meta).

### [x] PHIL-Q54 — Architecture : factorisation du boilerplate d'auth *(fait le 2026-07-05)*
Audit : `requireUser` (createClient + getUser + redirect) redéfini à l'identique dans 6 server actions, `lib/auth/` vide.
> Fix : `lib/auth/require-user.ts` unique, adopté dans les 6 fichiers (security, participants, poll, checklist, lodging, vault/unlock) ; imports `createClient`/`redirect` devenus inutiles nettoyés. Build + lint + 25 tests OK.

### [x] PHIL-Q53 — Offline : invalidation des blobs révoqués à la synchro *(fait le 2026-07-05)*
Audit : `syncTrip` reconstruisait les métadonnées mais **jamais** les blobs — un document supprimé/révoqué restait ouvrable offline indéfiniment.
> Fix : à chaque `syncTrip`, calcul des ids de documents cachés pour ce voyage désormais absents de la liste (RLS) → `document_blobs.bulkDelete` dans la transaction. Combiné à la purge Q41 (déconnexion), l'offline ne conserve plus que ce à quoi l'utilisateur a droit.

### [x] PHIL-Q52 — Robustesse : ordre delete-account + borne votePoll *(fait le 2026-07-05)*
Audit : `deleteMyAccount` se déconnectait **avant** de supprimer (un échec laissait l'utilisateur déconnecté avec un compte vivant) ; `votePoll` ne bornait pas l'index par le haut (vote fantôme gonflant le total).
> Fix : suppression **puis** déconnexion (échec → reste connecté + message clair, erreur loguée via `logger` sans PII) ; `votePoll` vérifie `optionIndex < options.length`. *(Rollback optimiste de la carte du monde laissé en note — enjeu faible : un simple refresh recolle l'état, et ça demanderait de changer le type de retour de l'action.)*

### [x] PHIL-Q51 — Maintenabilité : README + .env.example à jour *(fait le 2026-07-05)*
Audit : pas de README (point d'entrée install/run pour un contributeur humain).
> Fix : `README.md` (présentation, stack, démarrage, commandes, note sécurité, renvois vers CLAUDE.md/TODO.md/docs). `.env.example` complété (CRON_SECRET, VAPID) et corrigé (webhook en en-tête, plus en query string).

### [x] PHIL-Q50 — Coûts : marge de timeout sur les crons *(fait le 2026-07-05)*
Audit : crons en envois séquentiels sans `maxDuration` → risque de dépasser la limite 10 s Hobby à mesure que les données grossissent.
> Fix : `export const maxDuration = 60` sur les deux crons (autorisé sur Hobby, timeout par défaut désormais à 300 s côté plateforme). Remarque : `remotePatterns: "**"` laissé tel quel (les couvertures sont des URLs libres saisies par l'utilisateur — restreindre casserait la fonctionnalité ; à arbitrer si le quota d'optimisation d'images devient un souci).

### [x] PHIL-Q49 — Correction/Concurrence : écritures de la Bourse atomiques *(fait le 2026-07-05)*
Audit : `addExpense`/`markSettled` inséraient la dépense puis les bénéficiaires en deux temps avec un DELETE compensatoire manuel → dépense orpheline possible faussant les soldes.
> Fix : RPC Postgres `create_expense_with_beneficiaries` (plpgsql = transactionnelle, `security invoker` → RLS conservée, `search_path=''`), insère dépense + bénéficiaires en une transaction. `addExpense` et `markSettled` réécrits pour l'appeler. Params optionnels en `default null` (types Supabase optionnels, pas de cast). **Vérifié dans Chrome** : dépense de 12 € répartie sur 9 (chacun 1,33), totaux +12, puis supprimée — soldes revenus à l'identique.

### [x] PHIL-Q46 — Observabilité : error boundaries + logger structuré *(fait le 2026-07-05)*
Audit : aucune error boundary (`app/error.tsx`/`global-error.tsx` absents), aucun logging structuré — un incident prod se diagnostiquait à l'aveugle.
> Fix : `app/error.tsx` (segment) + `app/global-error.tsx` (racine) façon Verne avec bouton « Reprendre la route », logguant `error.digest` sans PII ; `lib/observability/logger.ts` (JSON une ligne, niveau/message/ts/contexte, règle « pas de PII dans le contexte »).

### [x] PHIL-Q41 — Sécurité : fuite du coffre par le cache offline *(fait le 2026-07-05)*
Audit : un document du coffre passé offline était stocké **en clair** dans IndexedDB (contournant passkey/filigrane/audit), et **rien n'était purgé à la déconnexion** (base par navigateur) → sur poste partagé, l'utilisateur suivant pouvait rouvrir les pièces d'identité du précédent.
> Fix : `lib/offline/clear.ts` (`clearOfflineData` = `offlineDb.delete()` + purge des caches `phil-*` du service worker). Appelé (1) à la déconnexion — bouton du menu profil converti en handler client qui purge **avant** `signOut` ; (2) via `OfflineAuthGuard` monté dans le layout racine, sur l'événement `SIGNED_OUT` (expiration/révocation). Toggle offline **retiré des documents du coffre** (les docs de voyage, moins sensibles et partagés au groupe, restent disponibles offline). `syncTrip` ne cachait déjà que `scope="TRIP"`.

### [x] PHIL-Q44 — Sécurité : rate limiting (Upstash, dégradation gracieuse) *(fait le 2026-07-05)*
Audit : aucun rate limiting. Modèle d'auth déjà robuste (Google OAuth + tokens UUID 122 bits), donc surface brute-force faible, mais les endpoints non authentifiés n'avaient aucun garde-fou anti-abus.
> Fix : `lib/security/rate-limit.ts` (`rateLimitOk`, `clientIp`) sur Upstash Redis, **inerte tant que `UPSTASH_REDIS_REST_URL/TOKEN` ne sont pas posés** (autorise tout), s'active sans changement de code une fois l'env configuré. Câblé sur le webhook inbound-email (30 req/min/IP → 429). ⚠️ Action Yves : poser les variables Upstash pour l'activer.

### [ ] PHIL-Q45 — Sécurité : chiffrement applicatif du coffre au repos
Chantier de fond (non traité dans le sprint de correctifs). Les documents du coffre reposent sur bucket privé + RLS + filigrane + WebAuthn + audit, mais **pas de chiffrement applicatif** : un service_role fuité ou un bucket mal configuré exposerait les pièces d'identité en clair. À cadrer : chiffrement côté client avec clé dérivée d'une passkey (WebAuthn PRF), gestion des clés, re-chiffrement de l'existant, impact sur le filigrane serveur (qui a besoin du clair). Alternative : requalifier honnêtement la promesse « chiffrement » de CLAUDE.md.

### [x] PHIL-Q43 — Sécurité : secrets en en-tête + comparaison constant-time *(fait le 2026-07-05)*
Audit : le secret du webhook inbound-email transitait en **query string** (`?secret=`, journalisée par Vercel/proxys), et les comparaisons de secrets (webhook + crons) étaient timing-leaky (`!==`).
> Fix : `lib/security/secret.ts` (`timingSafeEqualStr`, `checkBearer`). Le webhook lit désormais le secret via l'en-tête `x-webhook-secret` ou `Authorization: Bearer` (plus de query string), et les deux crons passent par `checkBearer` — toutes les comparaisons de secrets sont maintenant en temps constant et fail-closed.

### [x] PHIL-Q42 — Confidentialité : purge de rétention + PII hors des logs cron *(fait le 2026-07-05)*
Audit : les documents soft-supprimés n'étaient **jamais purgés** du Storage (scans de pièces d'identité conservés à vie — violation de la limitation de conservation), et le cron d'expiration renvoyait les **noms de fichiers** (PII) dans ses logs Vercel.
> Fix (dans le cron quotidien `document-expiry`, sans nouveau cron — limite Hobby à 2) : balayage des documents `deleted_at < now-30j` → suppression du blob Storage puis de la ligne (`purged_documents` dans la réponse). Résultats tracés par **id** de document, plus jamais par `file_name`.

### [x] PHIL-Q40 — Horloges : choisir "sa maison" *(fait le 2026-07-05)*
Retour Yves : pouvoir choisir sa maison directement depuis la page Horloges (pas seulement via Profil).
> Note : sélecteur "Ta maison" (`home-timezone-picker.tsx`, client) en tête de `/horloges` → action serveur `setHomeTimezone` (valide le fuseau IANA, met à jour `profiles.timezone` = source unique, revalidate). Sauvegarde immédiate au changement, badge "✓ enregistré". **Vérifié dans Chrome** : maison Paris→New York recalcule l'horloge de référence et les décalages ("+8 h par rapport à chez toi"), re-tri par fuseau ; réglage restauré à Europe/Paris après test.

### [x] PHIL-Q39 — Footer collé en bas + casse des horloges *(fait le 2026-07-05)*
Retour Yves : sur les pages courtes (ex. Horloges), le footer flottait au milieu au lieu de rester en bas. Cause : aucune zone de contenu ne grandissait pour remplir la hauteur. Fix global dans `app/layout.tsx` — `{children}` enveloppé dans un `flex flex-1 flex-col` qui pousse le footer en bas partout. Au passage, casse corrigée sur les horloges ("Par Rapport À Chez Toi" → "par rapport à chez toi") : le `capitalize` CSS s'appliquait à toute la ligne, remplacé par une majuscule sur le seul jour. **Vérifié dans Chrome**.

### [x] PHIL-Q31 — Navigation : liens principaux + menu du profil *(fait le 2026-07-05)*
Retours Yves (2026-07-05) : mettre **Horloges** et **Conseils** dans le menu principal tout en haut (à côté de Voyages/Coffre/Amis) ; l'avatar ouvre un **menu déroulant** (Profil / Exploration / Déconnexion) au lieu d'un lien direct.
> Note : `NAV_LINKS` = Voyages/Coffre/Amis/Horloges/Conseils dans le header ; liens Horloges/Conseils retirés de l'en-tête de "Tes voyages" (doublon). Nouveau `components/layout/profile-menu.tsx` (client) : avatar → menu (Profil / Exploration / Déconnexion via form server action), ferme au clic extérieur + Échap, `role=menu`. **Vérifié dans Chrome** : menu s'ouvre/ferme, avatar = image du compte Google.

### [x] PHIL-Q32 — Fix : crash de la carte du monde (Exploration) *(fait le 2026-07-05)*
`Cannot read properties of undefined (reading 'appendChild')` dans `world-map.tsx:74` (`.addTo(map)`) : le GeoJSON est chargé en async et le cleanup de l'effet détruit la carte avant l'arrivée des données (double montage StrictMode). Garde d'annulation.
> Note : flag `cancelled` posé dans le cleanup, testé avant `.addTo(map)`, `.catch()` sur le fetch. **Vérifié dans Chrome** : `/explorer` charge sans overlay d'erreur, mappemonde dessinée (France/Espagne/Italie/Grèce/Maroc colorés), console vierge.

### [x] PHIL-Q33 — Valise : vêtements Haut/Bas, coupe-vent & manteau, catégorie libre plus claire *(fait le 2026-07-05)*
Séparer la catégorie "Vêtements" en **Haut** / **Bas** ; ajouter **coupe-vent** et **manteau** ; rendre évident qu'on peut **créer sa propre catégorie** (le champ existe déjà mais n'est pas visible comme tel).
> Note : catalogue scindé en "Vêtements — Haut" (avec coupe-vent + manteau), "Vêtements — Bas", "Sous-vêtements & nuit". Formulaire d'ajout encadré avec titre explicite "Ajouter ton propre élément — tape une catégorie existante ou invente-en une nouvelle" et placeholders parlants ("Catégorie (ex : Plongée)"). La création de catégorie marchait déjà (champ libre + datalist) mais n'était pas identifiable comme telle.

### [x] PHIL-Q34 — Coffre : carte Vitale, carte européenne, libellé libre *(fait le 2026-07-05)*
Ajouter au coffre **carte Vitale** et **carte européenne d'assurance maladie** ; plutôt que la catégorie "Autre", permettre de **saisir le libellé à la main** (réutiliser `documents.label`).
> Note : deux valeurs d'enum `document_category` (`health_card`, `european_health_card`) ajoutées par migration (icônes HeartPulse / Stethoscope) ; `VAULT_CATEGORIES` + `CATEGORY_LABELS` étendus. Sur "Autre", un champ libellé libre apparaît (upload coffre) → stocké dans `documents.label`, affiché en priorité sur la liste et la fiche du coffre. Aucune policy RLS touchée.

### [x] PHIL-Q35 — Recherche calendrier en direct (debounce) *(fait le 2026-07-05)*
La recherche du calendrier recharge la page (form GET) : la passer en **live avec micro-délai** (debounce ~200 ms), filtrage côté client, sans rechargement.
> Note : liste du calendrier extraite en client component `calendar-days.tsx` — recherche live via `useDeferredValue` (input réactif, filtrage différé, zéro aller-retour serveur), `fuzzyMatch` réutilisé. La page serveur ne prend plus `?q=`. **Vérifié dans Chrome** : "plnoge" filtre instantanément la liste sans recharger (URL inchangée).

### [x] PHIL-Q36 — Timeline : colonne fixe, séparateurs de jours, jours plus larges, bascule mémorisée *(fait le 2026-07-05)*
Retours Yves : colonne des noms (transports/activités) **fixe** au scroll horizontal ; **séparateurs verticaux** légers entre les jours ; **jours plus larges** ; **bascule Calendrier ⇄ Timeline mémorisée** (on retrouve sa vue préférée en rouvrant un voyage).
> Note : colonne des noms + en-têtes de lane en `sticky left-0 z-20 bg-papier` (restent visibles au scroll horizontal) ; séparateurs de jours via `repeating-linear-gradient` doré léger décalé de la largeur de colonne ; `DAY_WIDTH` 84→130 px, `LABEL_W` 150 px. Bascule `TripViewToggle` (cookie `phil_trip_view`, 1 an) sur les deux vues ; le calendrier redirige vers la Timeline si c'est la vue mémorisée. **Vérifié dans Chrome** : au scroll jusqu'au 22 nov, les noms restent figés à gauche, séparateurs visibles, bascule fonctionnelle.

### [ ] PHIL-Q37 — i18n : français / anglais (traduire toute l'app)
Le profil a déjà le choix FR/EN (`profiles.locale`) mais rien n'est traduit. Mettre en place l'infrastructure i18n et traduire l'ensemble de l'UI (gros chantier, à cadrer). Conserver la microcopy Verne dans les deux langues.

### [x] PHIL-Q38 — Tests : review + unitaires + e2e *(fait le 2026-07-05)*
Review des tests puis ajout de tests e2e (demande Yves).
> **Review** : aucun test automatisé n'existait (ni Vitest ni Playwright, zéro devDependency de test) — c'est le choix assumé de CLAUDE.md ; seule vérif outillée = `scripts/verify-rls.ts`. Donc rien de cassé à réparer, mais une base à poser.
> **Ajouté** : **Vitest** (`pnpm` — l'échec d'install passé venait d'`npm`, le repo est en pnpm) + `vitest.config.ts` (alias `@/`), **25 tests unitaires** sur la logique pure la plus sensible : soldes de la Bourse (également/parts/exacts, règlements, remboursement→0, devise ignorée), recherche floue (plongée/plnoge/accents), distance haversine, catalogue valise. **Playwright** + Chromium + `playwright.config.ts` (réutilise le `pnpm dev`), **8 tests e2e** : redirections de sécurité (racine→login, /trips et /vault gatés, API document jamais servie à un visiteur), rendu de la page de connexion et des mentions légales, en-têtes de sécurité + **non-régression du viewer Q30** (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`). Scripts `test`, `test:watch`, `test:e2e`. **Découverte au passage** : le gating d'auth est un `proxy.ts` (nom Next 16 du middleware) qui redirige en 307 vers /login avant le handler — le 401 de la route n'est donc jamais atteint (défense en profondeur), le test asserte le vrai comportement. E2e authentifié écarté volontairement (login Google OAuth only : impossible sans backdoor, risqué sur une app à pièces d'identité).

### [x] PHIL-Q24 — Horloges du voyage (heure de chez soi + heure locale) *(fait le 2026-07-05)*
Comme les horloges monde d'un téléphone : afficher côte à côte l'heure de Paris (fuseau de l'utilisateur) et l'heure de la destination, en direct, sur la page du voyage.
> Note : bandeau 🕐 "14:32 Paris · 17:32 Île Maurice (+3 h)" en tête du calendrier — fuseau de chez soi = celui du profil, tick toutes les 15 s, décalage affiché ; masqué quand les deux fuseaux sont identiques (voyage en France).

### [x] PHIL-Q25 — Carte : départ de la maison + programme du jour sous la carte *(fait le 2026-07-05)*
1. Sur "Tout le voyage", ajouter le **point de départ** (l'origine du premier transport, ex. Paris CDG) au tracé. 2. Sous la carte, quand un jour est filtré : le **programme de la journée** listé dans l'ordre, avec **distance et temps de route depuis le point précédent**.
> Note : point "Départ : Paris CDG" (maison encre, ordre -1 → le tracé part de chez soi) géocodé depuis le `from` du premier transport, uniquement en vue "Tout le voyage" ; géocodage Nominatim désormais **caché 24 h**. Jour filtré : encart "Programme de la journée" sous la carte — pastilles numérotées assorties à la carte, heure, et entre chaque étape "↓ 12 km · ≈ 18 min de route" (haversine + OSRM ; trajets < 300 m masqués). Clic → fiche événement.

### [x] PHIL-Q26 — Documents : lier à un événement à l'upload, libellé libre, billets démo *(fait le 2026-07-05)*
1. Sur "Ajouter au voyage" : sélecteur **"Rattacher à un événement"** optionnel (le lien existe déjà dans l'autre sens via "Attacher un document" sur la fiche — et oui, plusieurs documents par événement sont déjà possibles). 2. Remplacer la **catégorie fermée** par un **libellé libre** pour les documents du voyage ("Forfait de ski") avec suggestions — les catégories restent au coffre où elles ont un sens (passeport, CNI…). 3. Seed : billets PDF attachés au Jardin de Pamplemousses.
> Note : colonne `documents.label` (≤ 60 car., prioritaire à l'affichage) ; l'upload voyage a un champ **"Type de document"** libre avec suggestions (datalist) et un sélecteur d'événement (rattachement + redirection vers la fiche) ; la catégorie interne est **déduite du libellé** (billet/forfait→ticket, voucher/réservation→voucher, hébergement/hôtel→lodging, assurance→insurance, sinon autre) pour que les filtres existants restent utiles. Le coffre garde ses catégories fermées. **Correctif au passage (retour Yves)** : les spécimens du coffre étaient des fichiers quasi vides (aperçu cassé) — le seed les remplace par de **vrais PDF** (passeport avec pseudo-MRZ, CNI, permis, numéros et expirations) ; billets Pamplemousses ajoutés et attachés à l'événement.

### [x] PHIL-Q21 — La Bourse (budget à la Tricount) *(fait le 2026-07-05)*
Analyse des captures Tricount d'Yves (tmp/tricount) : renommer Budget → **Bourse** ; trois vues — **Dépenses** (liste par date, recherche, ajout), **Équilibre** (soldes colorés, "on te doit X €", règlements, **"prochaine dépense payée par X"**), **Suivi** (existant) ; division d'une dépense **Également / En parts / Montants exacts** avec montants par personne en direct ; **clore la Bourse** (souvent quelques semaines après le voyage) — close, on atterrit sur l'Équilibre et l'ajout est gelé, réouvrable par le Capitaine.
> Note : colonnes `trips.purse_closed_at`, `expenses.split_mode` (equal/shares/exact), `expense_beneficiaries.share` (parts ou montant exact ; null = égal). `computeBalances` gère les 3 modes (**vérifié par test** : 2 parts/1 part → 66,67/33,33 ; exacts 70/30). Onglet **Bourse** : `/budget` = Dépenses (compteurs "Mes dépenses / Totales", **recherche floue**, groupement par date, formulaire avec sélecteur Diviser + montants par personne en direct, somme exacte contrôlée serveur ±0,01, CSV enrichi de la division) ; `/budget/equilibre` = Équilibre ("🤑 On te doit X" / "Tu dois X", soldes colorés vert/bordeaux, règlements + Marquer réglé, **"la prochaine dépense devrait être payée par X"** = plus gros débiteur, carte Clore/Rouvrir pour le Capitaine) ; `/budget/depenses` = Suivi (ma part recalculée selon le mode). **Bourse close** : redirection de l'onglet vers l'Équilibre (les Dépenses restent visibles via la pill), ajout et suppression gelés, règlements toujours possibles, badge 🔒. Écart : soldes des devises sans taux non affichés dans l'Équilibre (converties seulement — cas marginal déjà signalé dans Dépenses).

### [x] PHIL-Q22 — Recherche floue (dépenses, calendrier, idées) *(fait le 2026-07-05)*
"plongée / plongee / plnoge" doivent tous trouver la plongée : helper de recherche tolérante (accents, fautes légères) appliqué aux dépenses de la Bourse, au calendrier et aux idées (champ `?q=`).
> Note : `lib/search/fuzzy.ts` — normalisation accents + Levenshtein borné par mot (0 pour ≤ 3 lettres, 1 pour ≤ 5, 2 au-delà) + préfixe approché ; **vérifié par test** : plongée/plongee/plnoge/PLONGE → oui, xyz → non, "catamarn" → catamaran. Champ de recherche (`SearchForm`, GET, conserve tri/filtres) sur : le **calendrier** (titre + lieu + notes, état vide dédié), les **idées** (titre + description + lieu), et la **Bourse** déjà servie par Q21 (filtre instantané côté client).

### [x] PHIL-Q23 — Lien de groupe : WhatsApp ou Messenger *(fait le 2026-07-05)*
Le champ n'accepte que chat.whatsapp.com — accepter aussi les liens Messenger (m.me / messenger.com) et renommer en "groupe de discussion".
> Note : contrainte en base élargie (chat.whatsapp.com, m.me, messenger.com), Zod aligné (form + action), libellés "Groupe de discussion du voyage (WhatsApp ou Messenger)". La colonne garde son nom technique `whatsapp_group_url`.

### [x] PHIL-Q15 — Carte du programme façon Polarsteps *(fait le 2026-07-04)*
Retours Yves (2026-07-04) : pins **numérotés 1, 2, 3…** selon l'ordre chronologique du jour filtré ; style Polarsteps — pastilles rondes bord blanc + ombre, **tracé plein adouci** (fini le pointillé) ; **hébergements en icône maison** avec leur couleur propre. Seed : étoffer le vendredi 13 novembre (4 activités).
> Note : `TripMap` refondu — pastilles rondes 26 px (numéro blanc en gras), **maison SVG** 28 px pour les hébergements en **vert wagon #3f6e5a**, tracé plein arrondi avec **liseré papier** dessous (effet route Polarsteps), les pastilles photos (Q14) sont exclues du tracé. Numérotation chronologique par jour filtré ou sur tout le voyage (les hébergements gardent la maison, sans numéro). Vendredi 13 : Pamplemousses → Tante Athalie → Château de Labourdonnais → plage de Mont Choisy (seed relancé, 23 événements).

### [x] PHIL-Q14 — Page Photos : carte au-dessus, grille en dessous, façon Polarsteps *(fait le 2026-07-04)*
Remplacer la bascule Grille/Carte par **la carte en haut** (pins = vignettes rondes des photos, clic → visionneuse) **et la grille en dessous**. Clarifier les options d'envoi (légende + événement) en les regroupant avec le bouton "Ajouter des photos".
> Note : plus de bascule — carte (pastilles = **vignettes rondes 44 px** bord papier + ombre) au-dessus de la grille, compteur "x/n géolocalisées". **Icône 📍 sous chaque photo localisée** (demande complémentaire d'Yves) : défilement doux vers la carte + centrage et popup du pin (`focusId` ajouté à TripMap). Options d'envoi regroupées dans un encart avec le bouton (légende commune + rattachement, phrase d'explication). Popup du pin = légende + auteur (pas la visionneuse — le pin est déjà une vignette).

### [x] PHIL-Q20 — Valise : catalogue intégré par section, vaccins, dates *(fait le 2026-07-04)*
Retours Yves : plus de panneau séparé — les suggestions du catalogue apparaissent **directement dans chaque section** (avant le départ / à emporter / sur place) en items "en attente" à sélectionner ; compléter la liste (casquette, lunettes, masque et tuba, t-shirts, pull, pantalons, shorts…) ; **"Vaccins à jour" dans Avant le départ** ; **date optionnelle sur les items** ("à faire avant le…", colonne `due_date`).
> Note : catalogue réparti par section — **Avant le départ** (Vaccins à jour, passeports 6 mois, assurance, Google Maps hors-ligne, copies dans le coffre, banque prévenue), **À emporter** (Vêtements +chemises, Chaussures, Toilette, Indispensables +masque et tuba), **Sur place** (e-SIM, espèces). Puces pointillées "À sélectionner — {catégorie}" sous les items de chaque section, quantité modifiable inline (affichée si > 1), + = ajout, l'item réel gagne alors sa corbeille. Colonne `due_date` + champ date optionnel dans le formulaire d'ajout + "avant le 5 oct." affiché sur l'item. Le panneau "Garde-robe type" est supprimé (remplacé par l'intégration en section).

### [x] PHIL-Q16 — Tout préparer pour le hors-ligne *(fait le 2026-07-05)*
Le bouton "Préparer pour le hors-ligne" cache les données du voyage et chaque document a son bouton individuel — ajouter une préparation **complète** : données + tous les documents du voyage d'un coup.
> Note : bouton **"Tout préparer (documents inclus)"** à côté de l'existant — synchronise les données puis télécharge chaque document du voyage pas encore offline (progression "x/n", déjà présents comptés, limite 100 Mo I04 respectée avec message d'échec explicite).

### [x] PHIL-Q17 — Page Conseils de voyage *(fait le 2026-07-05)*
Conseils pratiques avant le départ : télécharger Google Maps hors-ligne, e-SIM, adaptateur, retraits/monnaie, santé/vaccins, copies des papiers dans le coffre Phil, etc. Accessible depuis les Paramètres du voyage et la liste des voyages.
> Note : page `/conseils` — 7 rubriques (cartes & navigation, téléphone/e-SIM, papiers, argent, santé, vol & bagages, sur place) + "Dans Phil avant de partir", chaque conseil renvoie quand c'est pertinent vers la fonctionnalité Phil correspondante (coffre, valise, offline, fiches d'urgence). Liens d'accès : en-tête de la liste des voyages + Paramètres du voyage.

### [x] PHIL-Q18 — Rappel "la journée de demain est vide" *(fait le 2026-07-05)*
La veille au soir (cron 16h UTC existant), si le lendemain d'un voyage en cours n'a aucun événement → push "Demain est libre — on prépare ?". Préférence on/off dédiée ; l'heure n'est pas réglable (cron Hobby = un passage fixe par jour, documenté).
> Note : préférence `empty_day_reminders` (défaut activé, 5e interrupteur au profil automatique) ; sweep dans le cron 16h UTC : "demain" = jour local de la destination (bornes converties via date-fns-tz), 0 événement → push vers le pool d'idées ("Demain est encore une page blanche"). **L'heure d'envoi n'est pas réglable** : le cron Hobby ne passe qu'une fois par jour à heure fixe — c'est l'interrupteur on/off qui pilote.

### [ ] PHIL-Q19 — Export / import JSON d'un voyage complet
Export JSON d'un voyage (événements, idées, valise, candidats — sans documents ni données du coffre) + bouton d'import qui recrée un voyage complet depuis ce JSON (validation Zod stricte). Décision : bonne idée — ça donne la sauvegarde, la duplication de voyage et le partage de squelettes entre amis en un seul mécanisme.

### [x] PHIL-Q12 — Carte des photos (position EXIF) *(fait le 2026-07-04)*
Dans l'onglet Photos : bascule Grille/Carte — les photos sont épinglées sur une carte à partir des **données GPS EXIF** lues dans le fichier au moment de l'upload (colonnes lat/lng sur `trip_photos`, extraction côté client). Les photos sans position restent en grille seulement.
> Note : **parseur EXIF GPS maison** (`lib/photos/exif-gps.ts`, ~90 lignes, zéro dépendance — npm plantait sur l'installation d'exifr et un parseur dédié suffit) : segment APP1 → IFD GPS → degrés décimaux, JPEG uniquement (PNG/WebP ne portent quasi jamais de GPS), best-effort. **Validé par test** avec un JPEG EXIF construit sur mesure (Le Morne : -20.456, 57.311 restitué exactement). Colonnes `lat/lng`, pills Grille/Carte (n) dans l'onglet Photos, carte OSM avec pions bordeaux (légende + auteur en popup). Les photos du seed démo portent des positions. À noter : beaucoup d'apps (WhatsApp, réseaux) **strippent l'EXIF** — les photos venant de l'appareil photo la gardent.

### [x] PHIL-Q06 — Inviter ses compagnons habituels en un tap *(fait le 2026-07-04)*
Sur la page Participants : sous le formulaire d'invitation par email, une rangée "Tes compagnons de route" — les amis du carnet (D08) pas encore à bord de ce voyage, avatar + prénom, un tap = invitation (réutilise `inviteFriend`, choix du rôle simple). "On part souvent avec les mêmes personnes" — demande Yves du 2026-07-04.
> Note : carte "Tes compagnons de route" (visible OWNER/EDITOR) au-dessus du formulaire d'invitation — puces avatar + prénom des co-voyageurs des autres voyages non encore à bord, un tap → `inviteFriend` D08 (email via Resend + lien dans la liste des invitations, rôle EDITOR comme depuis le carnet), état "✓" après envoi, `revalidatePath` ajouté à l'action pour que l'invitation apparaisse aussitôt. Doublons gérés par le flux existant ("déjà en attente").

---

## Catégorie M — Animations & délices visuels (à traiter en fin de projet, demandé le 2026-07-03)

### [x] PHIL-M01 — Animation d'ouverture/fermeture du coffre *(fait le 2026-07-03)*
Sur l'écran "Coffre verrouillé" et au déverrouillage : animation d'une porte de coffre-fort de banque ancienne, **ronde**, avec les barres/branches de la roue **couleur or** (laiton Phil). Ouverture : la roue tourne, puis la porte pivote et s'ouvre. Fermeture (verrouillage/expiration de session) : la porte se referme, puis la roue tourne. SVG + CSS animations (pas de lib lourde), `prefers-reduced-motion` respecté.
> Note : `VaultDoor` (SVG + keyframes CSS inline) — porte encre, roue 6 branches laiton, 12 rivets, charnières, intérieur révélé en perspective (rotateY, pivot côté charnières). Arrivée sur l'écran : porte se rabat puis roue verrouille ; déverrouillage réussi : roue tourne (sens inverse) puis porte pivote, titre "Bienvenue dans ton coffre", entrée après 1,8 s. `prefers-reduced-motion` : porte statique. Fix au passage : coordonnées des rivets figées (mismatch d'hydratation flottant serveur/client).

### [x] PHIL-M02 — États de chargement sur le thème Jules Verne *(fait le 2026-07-03)*
Remplacer les loaders génériques par une petite collection d'animations tirées au sort, dans la palette Phil :
- **Montgolfière** rouge et blanche, nacelle en osier — traverse de gauche à droite en montant/descendant légèrement et en se balançant (*Cinq semaines en ballon*)
- **Éléphant** qui marche (la traversée de l'Inde de Phileas)
- **Bateau à vapeur** qui avance sur des vagues (le Mongolia / l'Henrietta)
- **Sous-marin** style Nautilus avec hublots (*Vingt mille lieues sous les mers*)
- Autres pistes validables au moment du ticket : **locomotive à vapeur** (le train de Bombay à Calcutta), **traîneau à voile** (l'épisode des plaines américaines du roman), **obus lunaire** (*De la Terre à la Lune*)
SVG animés en CSS, composant `<PhilLoader />` réutilisable, tirage aléatoire, `prefers-reduced-motion` → état statique.
> Note : 4 scènes livrées — montgolfière (traversée + balancement + nacelle osier), éléphant (pattes alternées, trompe, tapis bordeaux), vapeur (tangage, vagues 2 plans, fumée), Nautilus (éperon, hublots laiton, hélice, bulles) — chacune avec sa microcopy ("Phil traverse l'Inde à dos d'éléphant…"). Tirage au mount côté client (pas de mismatch), branché en fallback global `app/(app)/loading.tsx`. Locomotive/traîneau/obus gardés en réserve dans le ticket d'origine. Vérifié visuellement (4 scènes).

---

## Backlog — différé volontairement (ne pas traiter sans demande explicite)

**Outillage retiré du P0** (à réintroduire quand un second contributeur arrive ou que le projet grossit) :

- **PHIL-A06 — Monitoring Sentry** : installer `@sentry/nextjs`, configurer le DSN, breadcrumbs sur les actions critiques. Différé : les logs Vercel + retours directs des amis suffisent en v1.
- **PHIL-A07 — Pipeline CI GitHub Actions** : lint, type-check, tests et build sur chaque PR. Différé : Vercel builde déjà chaque push et chaque PR avec preview.
- **PHIL-A08 — Tests automatisés (Vitest + Playwright)** : tests unitaires et end-to-end sur les parcours principaux. Différé : la vérification RLS manuelle (PHIL-B12) couvre le risque principal ; les tests auto viendront avec la maturité du projet.

**Idées v2+** (dépoussiéré le 2026-07-04 — la majorité de la liste initiale est réalisée : carte N01, météo O02/O03, checklist N11+N03, dépenses N09+O09, iCal N02, OCR MRZ N04, mode Aujourd'hui N10, galerie photos O10, templates N03, import par fichier O01 ; le chat intégré est **écarté** — WhatsApp garde ce rôle, décision du 2026-07-04. Import email, devises et partage public sont devenus les tickets P01-P03) :

- Génération PDF "récap/souvenir du voyage" imprimable (s'appuiera sur la galerie O10 ; pdf-lib déjà dans la stack)
- Suggestions d'activités contextuelles à la destination (API de POI à évaluer)
- "Dupliquer un voyage existant comme template" (évolution de N03)
- Photos basse qualité pour le voyage démo (décision O10, au prochain passage sur le seed)
- Application mobile native (si la PWA atteint ses limites)
