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

### [ ] PHIL-C04 — Enregistrement passkey WebAuthn
Page "Sécurité" avec bouton "Activer Face ID / Touch ID pour le coffre". Implémentation du flow WebAuthn registration : challenge serveur, création du credential côté client, stockage de la public key en base. Table `user_passkeys` : `id`, `user_id`, `credential_id`, `public_key`, `device_name`, `created_at`, `last_used_at`.

### [ ] PHIL-C05 — Authentification passkey à l'ouverture du coffre
À chaque accès à une page du coffre, déclencher un flow WebAuthn authentication. Si l'user n'a pas de passkey enregistrée, fallback sur une re-authentification Google. La validation passkey crée une session "vault unlocked" valide 15 minutes.

### [ ] PHIL-C06 — Suppression de compte (RGPD)
Bouton dans le profil "Supprimer mon compte". Confirmation forte. Job qui supprime : participants des voyages, documents (storage + base), idées créées, log d'audit. Pour les voyages dont l'user est OWNER unique : transfert au plus ancien EDITOR ou suppression du voyage si seul. Délai de grâce de 30 jours optionnel.

### [ ] PHIL-C07 — Export de données personnelles (RGPD)
Endpoint qui génère un ZIP avec : profil, liste des voyages, événements créés, documents (en clair, déchiffrés), idées. Téléchargement unique avec lien expirant. Limite à un export par 24h pour éviter les abus.

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

### [ ] PHIL-D05 — Invitation par email
Sur la page Participants, formulaire pour inviter par email avec choix du rôle (EDITOR par défaut). Génération d'un token unique, création d'une ligne dans `trip_invitations`, envoi d'un email via Resend avec un lien `https://phil.vercel.app/invitations/{token}`.

### [ ] PHIL-D06 — Acceptation d'invitation
Page `/invitations/{token}` qui affiche les infos du voyage et un bouton "Rejoindre". Si l'user n'est pas connecté, le rediriger vers login et revenir sur la page après. À l'acceptation, création de la ligne `trip_participants` et marquage de l'invitation comme acceptée. Gestion des invitations expirées (30 jours) ou déjà acceptées.

### [x] PHIL-D07 — Gestion des participants *(fait le 2026-07-03)*
Liste des participants avec leur rôle. OWNER peut : changer le rôle de quelqu'un, retirer un participant, transférer la propriété (passer OWNER à quelqu'un d'autre, devenir EDITOR). Un user peut quitter un voyage de lui-même (sauf le dernier OWNER qui doit transférer avant).
> Note : sélecteur de rôle (Éditeur/Lecteur — passer OWNER = uniquement via "Passer capitaine"), transfert en deux updates ordonnés (promotion de l'autre PUIS rétrogradation, pour rester couvert par la policy OWNER), retrait avec confirmation, "Quitter le voyage" pour tous avec garde-fou dernier-capitaine (vérifié en réel). Vérifs applicatives doublées par la RLS B09.

### [ ] PHIL-D08 — Carnet d'amis
Page qui liste les personnes avec qui l'user a déjà voyagé (extrait des `trip_participants`). Permet de les ré-inviter en un clic sur un nouveau voyage. Pas de social, juste un cache pratique.

### [ ] PHIL-D09 — Upload d'image de couverture de voyage
Découvert en D02 (traité en URL seulement) : permettre l'upload d'une image de couverture vers un bucket Supabase Storage public-aux-membres (bucket dédié `covers`, policies RLS storage, redimensionnement/limite de taille). À traiter en Phase 5 avec les documents du voyage, ou à la demande.

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

### [ ] PHIL-E03b — Durcissement de la visualisation
Évolution du viewer E03a pour les documents `scope=VAULT` : application du filigrane dynamique via le service E06 sur chaque ouverture, headers `Cache-Control: private, no-store`, vérification systématique de la session "vault unlocked" (C05). Les documents `scope=TRIP` restent servis sans filigrane.

### [x] PHIL-E04 — Suppression et modification de document *(fait le 2026-07-03)*
Sur un document, action "Modifier" (renommage, changement de catégorie, mise à jour métadonnées) et "Supprimer" (confirmation, suppression du blob storage et de la ligne en base, soft delete d'abord). Loggué dans `vault_access_log`.
> Note : édition inline (nom, catégorie, expiration, numéro) avec Zod + RLS owner. Suppression = **soft delete** (`deleted_at`, blob conservé) conformément au "soft delete d'abord" — la purge définitive blob+ligne viendra avec C06 ou un nettoyage périodique (à créer le moment venu). Actions logguées UPDATE/DELETE. Vérifié en réel : piste d'audit complète UPLOAD → VIEW → UPDATE → DELETE, deleted_at posé, blob conservé, doc absent de la liste et du viewer.

### [x] PHIL-E05 — Partage d'un document du coffre vers un voyage *(fait le 2026-07-03)*
Sur un document du coffre, bouton "Partager avec un voyage" qui ouvre une modale avec la liste de mes voyages actifs. Sélection du voyage → création d'une ligne `document_shares`. Le document devient visible des autres participants du voyage sans changer de scope. Affichage clair "Partagé avec : Voyage Mauritius nov 2026" sous le document. Possibilité de retirer le partage. Actions logguées (`SHARE` / `UNSHARE`).
> Note : section "Partages" sur `/vault/[id]` (`share-manager.tsx`) — modale des voyages actifs (non archivés, via RLS), état "Privé — toi seul…" sinon. La sécurité du partage est portée par la policy RLS B10 (propriétaire seul, doc VAULT seul, voyage où il participe). Actions SHARE/UNSHARE logguées. Vérifié en réel : partage → badge visible → retrait → audit UNSHARE, base nettoyée.

### [ ] PHIL-E06 — Filigrane dynamique PDF
Service côté serveur qui prend un PDF en entrée et applique un filigrane diagonal avec : email du visualiseur, timestamp, et "Confidentiel - Ne pas diffuser". Implémenté avec pdf-lib. Pour les images (JPG/PNG), conversion en PDF d'abord puis filigrane. Performance cible : moins de 200ms par document.

### [ ] PHIL-E07 — Alerte expiration documents
Cron job (Vercel Cron, gratuit sur Hobby avec 2 jobs) qui scanne quotidiennement les `expires_at` et envoie un email Resend aux propriétaires à J-180, J-90, J-30 et J-7. Badge "Expire bientôt" affiché dans l'UI du coffre quand `expires_at < now + 90 jours`.

### [ ] PHIL-E08 — Page audit log du coffre
Vue "Activité de mon coffre" qui affiche les dernières entrées de `vault_access_log` filtrées sur les documents de l'user. Permet de voir qui a consulté quoi et quand. Filtres par document, par action, par date. Le log est alimenté depuis la Phase 3 (B07) : la page révèle l'historique complet.

---

## Catégorie F — Calendrier & événements de voyage

### [x] PHIL-F01 — Vue liste du calendrier *(fait le 2026-07-03)*
Vue par défaut sur mobile et probablement la plus utilisée. Événements groupés par jour, dans l'ordre chronologique. Affichage compact : heure, type (icône), titre, lieu. Tap sur un événement → page détail. Bandeau "Aujourd'hui" si on est dans la période du voyage.
> Note : `date-fns-tz` installé, helper central `formatInTimezone` posé dès maintenant dans `lib/events/datetime.ts` (F09 n'aura qu'à généraliser). Groupement par jour **dans le fuseau de chaque événement**, badge "Aujourd'hui" calculé dans le fuseau du voyage. Icônes lucide par type (avion/lit/boussole). Bouton "Ajouter" visible OWNER/EDITOR seulement, pointe vers `/events/new` (F04-F06). Vérifié en réel : conversion UTC→Maurice exacte, groupement 2 jours, badge Aujourd'hui.

### [ ] PHIL-F02 — Vue jour du calendrier
Vue détaillée d'une journée avec une grille horaire. Affichage des événements positionnés sur leurs créneaux. Utile pour les journées chargées.

### [ ] PHIL-F03 — Vue timeline du voyage
Vue horizontale type Gantt qui montre la durée totale du voyage avec tous les événements. Surtout utile pour les transports et les hébergements qui couvrent plusieurs jours.

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

### [ ] PHIL-G04 — Suppression d'un document du voyage
Possible par : (a) le propriétaire du document, (b) un OWNER du voyage. Confirmation requise. Loggué.

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

### [ ] PHIL-H05 — Rejet ou archivage d'une idée
Bouton "Pas pour ce voyage" qui passe l'idée en statut `DISMISSED`. Filtre par défaut masque les dismissed mais on peut les afficher.

---

## Catégorie I — Mode offline & PWA

### [ ] PHIL-I01 — Configuration PWA avec Serwist
Installer Serwist, configurer le manifest PWA (nom "Phil", icônes, theme color, display standalone). Vérifier que l'application est installable depuis Safari iOS et Chrome Android via "Ajouter à l'écran d'accueil".

### [ ] PHIL-I02 — Stratégie de cache des assets statiques
Cache-first pour les assets Next.js (JS, CSS, fonts, images). Network-first avec fallback cache pour les pages HTML. Update du service worker en arrière-plan avec notification utilisateur "Nouvelle version disponible".

### [ ] PHIL-I03 — Cache offline des données voyage
Setup Dexie.js (wrapper IndexedDB). Tables locales : `trips`, `events`, `documents_metadata`, `ideas`. Quand l'user ouvre un voyage en ligne, sync automatique des données dans IndexedDB. Bouton explicite "Préparer pour offline" qui force la synchro complète.

### [ ] PHIL-I04 — Cache offline des documents
Sur un document, bouton "Disponible offline". Téléchargement du fichier tel que servi par le viewer au moment du téléchargement (avec filigrane pour les docs du coffre une fois E03b en place). Stockage dans IndexedDB. Indicateur visuel "Offline" sur les documents disponibles. Limite de stockage configurable (par défaut 100 Mo).

### [ ] PHIL-I05 — Mode lecture offline
Détection de l'absence de réseau via `navigator.onLine` + ping périodique. Bandeau "Mode offline" affiché. Toutes les pages voyages, événements, documents marqués offline restent accessibles. Les actions d'écriture sont désactivées avec message "Reconnectez-vous pour modifier".

### [ ] PHIL-I06 — Resync à la reconnexion
Quand le réseau revient, refetch automatique des données voyage en cours. Notification discrète "Données synchronisées". Pas de gestion de conflit puisque l'écriture offline n'est pas supportée en v1.

---

## Catégorie J — Sécurité, RGPD & qualité

### [ ] PHIL-J01 — Headers de sécurité
Configuration Next.js (`next.config.js` ou middleware) : Content-Security-Policy stricte, Strict-Transport-Security, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy pour limiter les API navigateur.

### [ ] PHIL-J02 — Rate limiting sur les endpoints critiques
Limitation par IP et par user sur : login, upload de document, accès à un document, création d'invitation. Implémentation avec Upstash Redis (free tier 10k commandes/jour) ou via les headers Vercel Edge Config.

### [ ] PHIL-J03 — Validation Zod sur tous les endpoints
Tout input utilisateur (formulaires, paramètres URL, body API) validé par un schéma Zod avant traitement. Erreurs renvoyées avec messages clairs côté client.

### [ ] PHIL-J04 — Politique de confidentialité et mentions légales
Pages `/privacy` et `/legal` avec : finalité du traitement, données collectées, durée de conservation, droits RGPD (accès, rectification, suppression, portabilité), contact. Lien dans le footer.

### [ ] PHIL-J05 — Bannière cookies / consentement
Bannière minimaliste au premier visite : pas de tracking analytics par défaut, donc pas de bannière "accepter / refuser" complexe. Mention "Ce site utilise des cookies techniques nécessaires à l'authentification" sans bouton.

### [ ] PHIL-J06 — Audit de dépendances
Activation de Dependabot ou Renovate sur le repo GitHub pour les MAJ de sécurité automatiques (fonctionnalité GitHub native, sans CI). `npm audit` à lancer régulièrement en local, et systématiquement avant un déploiement important.

### [ ] PHIL-J07 — Backup base de données
Supabase fait des backups automatiques quotidiens (rétention 7 jours sur free tier). Documenter la procédure de restauration. Optionnel : export hebdomadaire vers un stockage tiers via cron.

### [ ] PHIL-J08 — Plan de réponse à incident
Document `INCIDENT.md` avec : que faire en cas de fuite de données, contacts CNIL, procédure de notification aux utilisateurs, checklist de remédiation. Pas critique pour un usage perso mais bonne hygiène.

---

## Catégorie K — Notifications & emails

### [ ] PHIL-K01 — Setup Resend et templates de base
Créer un compte Resend, vérifier un domaine (au début, on utilise leur domaine de test, plus tard un domaine perso). Setup React Email pour des templates en JSX. Templates de base : invitation voyage, alerte expiration document, rappel événement J-1. Signature des emails : "À bientôt sur la route, Phil".

### [ ] PHIL-K02 — Email d'invitation à un voyage
Template clair : nom de l'inviteur, nom du voyage, dates, destination, bouton "Rejoindre le voyage", lien de fallback. Envoi via Resend API depuis l'endpoint d'invitation.

### [ ] PHIL-K03 — Email d'alerte expiration document
Envoyé par le cron job d'expiration. Template : "Votre passeport expire dans X jours". Lien vers le coffre. Possibilité de désactiver ces alertes dans les préférences.

### [ ] PHIL-K04 — Préférences de notification
Page dans le profil pour activer/désactiver chaque type d'email (invitations, alertes expiration, rappels événements). Stockage dans `profiles.notification_preferences` (JSONB).

---

## Catégorie L — Évolutions futures (à creuser)

### [ ] PHIL-L01 — Hébergements candidats (multi-options)
Permettre de saisir plusieurs options d'hébergement pour un même créneau avant de faire un choix définitif. Cas d'usage : comparer 3 Booking pour une nuit (prix, conditions d'annulation, distance), voter en groupe, puis convertir le choix retenu en événement LODGING. Cas d'usage secondaire : prendre 2 logements simultanés pour un même groupe (ex : ski, groupe > capacité d'un seul logement). Analyser si on étend `trip_events` (statut `CANDIDATE` réutilisant le mécanisme votes/conversion des idées) ou si on crée un concept dédié de "candidats".

### [ ] PHIL-L02 — Avis qualitatifs et aide à la décision
Aller au-delà du vote +1 sur les idées : permettre des avis qualitatifs ("Vaut le coup", "Optionnel", "Trop cher") sur les activités et hébergements candidats. Inspiration : les colonnes "Vaut le coup ?" et "Choix 1/2" du spreadsheet Islande. Analyser le bon format (tags prédéfinis, commentaires libres, notation 1-5, etc.).

---

## Backlog — différé volontairement (ne pas traiter sans demande explicite)

**Outillage retiré du P0** (à réintroduire quand un second contributeur arrive ou que le projet grossit) :

- **PHIL-A06 — Monitoring Sentry** : installer `@sentry/nextjs`, configurer le DSN, breadcrumbs sur les actions critiques. Différé : les logs Vercel + retours directs des amis suffisent en v1.
- **PHIL-A07 — Pipeline CI GitHub Actions** : lint, type-check, tests et build sur chaque PR. Différé : Vercel builde déjà chaque push et chaque PR avec preview.
- **PHIL-A08 — Tests automatisés (Vitest + Playwright)** : tests unitaires et end-to-end sur les parcours principaux. Différé : la vérification RLS manuelle (PHIL-B12) couvre le risque principal ; les tests auto viendront avec la maturité du projet.

**Idées v2+** (issues de l'analyse initiale, non planifiées) :

- Parsing automatique des emails de confirmation (Booking, SNCF, Air France) via Gmail OAuth
- Intégration carte (Mapbox / Leaflet+OSM) avec événements géolocalisés
- Météo par destination et par jour
- Suggestions d'activités contextuelles à la destination
- Conversion de devise et vue budget du voyage
- Checklist de bagages partagée avec templates
- Suivi des dépenses partagées (mini-Tricount)
- Export / synchronisation Google Calendar (flux iCal)
- OCR sur les documents d'identité (extraction MRZ) pour pré-remplir les métadonnées
- Génération PDF "récap voyage" imprimable
- Application mobile native (si la PWA atteint ses limites)
- Mode "live" pendant le voyage (événement en cours mis en avant, contacts d'urgence)
- Chat intégré par voyage
- Galerie photos partagée
- Partage public d'un récap en lecture seule
- Templates de voyages réutilisables
