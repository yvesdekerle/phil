# AUDIT-REPORT — Phil

> Audit complet en lecture seule du repository `phil` (carnet de voyage collaboratif + coffre-fort d'identité).
> Réalisé le **2026-07-06**. Aucun fichier de code modifié — livrable unique : ce rapport.
> Méthode : Phase 0 (contexte + vérifications outillées), Phase 1 (5 agents parallèles, un par bloc, couverture exhaustive de l'arborescence), Phase 2 (contre-vérification adversariale de chaque finding 🔴/🟠 par relecture du code incriminé), Phase 3 (rédaction).

---

## 0. Suivi de remédiation — mise à jour du 2026-07-08

> Re-scoring des catégories touchées par la campagne de remédiation (catégorie R du `TODO.md`) et par la livraison du coffre E2EE (PHIL-T01). Vérifications outillées rejouées le 2026-07-08 : `pnpm build`/`biome check`/`tsc` **verts** ; `pnpm test` **104 tests** (vs 81) ; `pnpm audit --prod` = **2 *moderate*** (postcss, transitif) vs *8 high* à l'audit initial ; inventaire code : **0** `any`, **0** `@ts-ignore`, **0** `TODO/FIXME` sauvage, **0** `dangerouslySetInnerHTML`.

**Note globale pondérée : 12,4 → ~14,2 / 20.** Le 🔴 (perte de données à la suppression de compte) est **levé** (R05), les deux 🟠 d'intégrité/observabilité aussi (R04, R03), et la promesse de chiffrement du coffre est désormais **tenue** (E2EE client PHIL-T01). Restent 3 🟠 gated sur une **décision** (R09 SSRF, R10 chiffrement `document_number`) ou une **action infra** (R11 base dev/prod séparée, R12 Upstash) — non corrigeables en pur code.

| # | Catégorie | Avant | Après | Ce qui a changé |
|---|---|---|---|---|
| A5 | Couverture des tests | 12 | **16** | 🟠 levé : zones critiques testées (filigrane R14, session coffre + reprise OWNER R13). 81→104 tests. |
| A7 | Dépendances & supply chain | 12 | **16** | 🟠 levé : `next` 16.2.2→16.2.10 (R01). Prod : 8 *high* → 2 *moderate* (postcss transitif). |
| B10 | Auth & contrôle d'accès (×3) | 12 | **14** | 🟠 email invité vérifié (R02). 🟠 escalade EDITOR→OWNER : trigger écrit (R08) **mais pas encore appliqué** → 15 une fois `db:push` fait. |
| B12 | Secrets & protection données (×3) | 12 | **15** | Coffre **chiffré de bout en bout** livré (PHIL-T01 : docs scellés côté client, partage re-chiffré, filigrane client). Résiduel : `document_number` en clair (R10). |
| D16 | Intégrité des données (×2) | 6 | **15** | 🔴 **levé** (R05 : réattribution au « Voyageur parti », soldes préservés) + 🟠 levé (R04 : purge Storage). Résiduel 🟡 R18. Le plafond 🔴 disparaît. |
| D17 | Observabilité & exploitation | 9 | **13** | 🟠 levé : logs serveur sur l'ajout de document / viewer / audit (R03). Le « bug d'hier soir » redevient reconstituable. |
| E18 | DX & outillage | 10 | **11** | 🟡 Biome/not-found/doc (R07). 🟠 base unique dev/prod (R11) **toujours ouvert** (infra). |

Catégories inchangées (aucune remédiation depuis le 2026-07-06) : A1 15, A2 14, A3 14, A4 15, A6 16, A8 15, A9 12, **B11 12** (🟠 SSRF R09 en attente de décision), C13 14, C14 14, D15 14.

**Ce qui débloquerait les points restants** : appliquer R08 (`db:push`, B10 +3 pondéré) ; trancher R09 (B11 +9 pondéré) ; provisionner R11/R12 (E18 + confiance B10/B12). Cible atteignable après ces trois gestes : **~15,5–16 / 20**.

---

## 1. Synthèse exécutive

**Note globale pondérée : 12,4 / 20.** Verdict : *un projet personnel exceptionnellement discipliné sur la forme (build/lint/types verts, dette 100 % tracée, RLS solide), dont les faiblesses réelles se concentrent sur la défense en profondeur, l'exploitabilité opérationnelle et l'intégrité des données à la suppression — jamais sur une faille d'accès directe exploitable par un attaquant.*

**Un finding 🔴** (perte de données silencieuse à la suppression de compte, cf. D16) et **9 findings 🟠**, tous confirmés en Phase 2, tous corrigeables en effort S/M (un seul L). Le 🔴 n'est pas une faille d'accès mais une **destruction de données** : il se déclenche par une action légitime (un utilisateur supprime son compte), pas par un exploit — d'où l'absence de brèche exploitable par un tiers.

**3 forces**
- Sécurité d'accès portée par la RLS Postgres : 52 migrations relues, aucune policy `USING (true)`, helpers `security definer` bornés (`set search_path=''`, `stable`), pattern initplan `(select auth.uid())` systématique (aucun piège quadratique), buckets Storage sans lecture anonyme, WebAuthn dans les règles de l'art.
- Discipline de code remarquable : 0 `any`/`@ts-ignore`, 0 `catch` vide, 0 `TODO`/`FIXME` sauvage, dette entièrement tracée dans `TODO.md`, secrets absents du code et de l'historique git, `.env.example` exactement aligné sur le code.
- Outillage mûr pour un projet solo : CI GitHub Actions (lint/types/build/tests), Dependabot groupé, `verify-rls.ts` (vrai test sécurité multi-utilisateurs, ~28 assertions), tests unitaires honnêtes (4/5 mutations détectées).

**3 risques majeurs**
- **Intégrité des données à la suppression (🔴)** : la suppression d'un compte cascade et **efface les dépenses du groupe** (soldes du tricount de tout l'équipage faussés silencieusement) ; la suppression d'un voyage **abandonne les blobs Storage** (billets/vouchers nominatifs conservés à vie, quota Free rongé).
- **Défense en profondeur de sécurité** : un EDITOR peut modifier via l'API PostgREST des colonnes que seul le code réserve à l'OWNER (partage public, archivage) ; SSRF aveugle via l'optimiseur d'images ; `next@16.2.2` porte 8 CVE *high* dont un bypass du middleware qui garde les routes.
- **Cécité opérationnelle** : les échecs des opérations les plus sensibles (ajout de document d'identité) n'émettent **aucun log serveur** — le bug signalé par un ami n'est pas reconstituable.

**Écart promesse/code notable** : `CLAUDE.md` promet le « chiffrement » du coffre ; les numéros de pièces d'identité sont stockés en clair et le filigrane n'est appliqué qu'à la lecture.

---

## 2. Tableau des notes

| # | Catégorie | Note /20 | 🔴 | 🟠 | 🟡 | 🔵 | Tendance |
|---|---|---|---|---|---|---|---|
| A1 | Architecture du projet | 15 | 0 | 0 | 4 | 1 | Point fort |
| A2 | Découpage des composants | 14 | 0 | 0 | 4 | 1 | Correct |
| A3 | Design & principes logiciels | 14 | 0 | 0 | 4 | 1 | Correct |
| A4 | Qualité du code | 15 | 0 | 0 | 5 | 1 | Point fort |
| A5 | Couverture des tests (quantité) | 12 | 0 | 1 | 3 | 2 | À traiter |
| A6 | Qualité des tests (×2) | 16 | 0 | 0 | 3 | 2 | Point fort |
| A7 | Dépendances & supply chain | 12 | 0 | 1 | 4 | 2 | À traiter |
| A8 | Maintenabilité & évolutivité | 15 | 0 | 0 | 3 | 2 | Point fort |
| A9 | Cohérence transversale | 12 | 0 | 0 | 6 | 1 | À traiter |
| B10 | Authentification & contrôle d'accès (×3) | 12 | 0 | 2 | 1 | 1 | À traiter |
| B11 | Sécurité applicative OWASP (×3) | 12 | 0 | 1 | 3 | 1 | À traiter |
| B12 | Secrets & protection des données (×3) | 12 | 0 | 1 | 2 | 1 | À traiter |
| C13 | Performance frontend | 14 | 0 | 0 | 3 | 2 | Correct |
| C14 | Performance backend & DB | 14 | 0 | 0 | 4 | 4 | Correct |
| D15 | Gestion des erreurs & résilience | 14 | 0 | 0 | 4 | 2 | Correct |
| D16 | Intégrité des données (×2) | 6 | 1 | 1 | 3 | 2 | Urgent |
| D17 | Observabilité & exploitation | 9 | 0 | 1 | 3 | 2 | Urgent |
| E18 | DX & outillage | 10 | 0 | 1 | 3 | 2 | À traiter |

**Note globale pondérée** = Σ(note×poids) / Σ(poids) = **322 / 26 = 12,38 ≈ 12,4 / 20**
(le 🔴 sur D16 plafonne cette catégorie à 6/20 — barème : 🔴 plafonne à 3/10.)
(poids : B10/B11/B12 ×3 ; A6 et D16 ×2 ; les 13 autres ×1 ; Σ poids = 26.)

---

## 3. Top 10 des findings (toutes catégories, triés par sévérité puis effort croissant)

Un 🔴 en tête (perte de données), puis 9 🟠 du moins coûteux au plus coûteux à corriger.

| # | Sév. | Cat. | Finding | Effort |
|---|---|---|---|---|
| 1 | 🔴 | D16 | `ON DELETE CASCADE` sur `profiles` : supprimer un compte efface les dépenses du groupe (soldes de tout l'équipage faussés silencieusement) | **M** |
| 2 | 🟠 | A7 | `next@16.2.2` : 8 CVE *high* en prod (dont bypass middleware) — bump ≥ 16.2.5 | **S** |
| 3 | 🟠 | B10 | Email invité non vérifié à l'acceptation d'invitation (token porteur 30 j) | **S** |
| 4 | 🟠 | D17 | Le chemin d'ajout de document n'émet aucun log serveur en cas d'échec | **S** |
| 5 | 🟠 | B10 | Escalade EDITOR→OWNER : colonnes `trips` OWNER-only protégées côté code seul | **M** |
| 6 | 🟠 | B11 | SSRF aveugle via l'optimiseur d'images (`remotePatterns:"**"` + URL de couverture libre) | **M** |
| 7 | 🟠 | A5 | Zones critiques (suppression de compte, filigrane, session coffre) sans aucun test | **M** |
| 8 | 🟠 | D16 | Suppression d'un voyage : aucun nettoyage Storage (blobs orphelins à vie) | **M** |
| 9 | 🟠 | E18 | Une seule base Supabase partagée dev / preview / prod (documents d'identité réels) | **M** |
| 10 | 🟠 | B12 | « Chiffrement » du coffre promis mais absent ; n° de pièce d'identité stocké en clair | **L** |

---

## 4. Détail par catégorie

### A1 — Architecture du projet — 15 / 20

Arborescence App Router exemplaire et conforme à `CLAUDE.md` : colocation systématique (`actions.ts` + `*-client.tsx` par route), `components/` et `lib/` sous-structurés par domaine (22 domaines, seulement 3 fichiers à la racine de `lib/`, aucun fourre-tout), mutations quasi exclusivement en server actions (31 fichiers `"use server"`). Le sens des dépendances est globalement respecté ; les défauts sont réels mais mineurs. À noter que `CLAUDE.md` a dérivé de la réalité (annonce `lib/encryption/` inexistant, npm au lieu de pnpm).

**Findings**
- 🟡 **Imports remontants `components/` → `app/`** — Preuve : `components/layout/profile-menu.tsx:7`, `components/map/world-map.tsx:6`, `components/ideas/{polls-section,dismiss-button,vote-button}.tsx` — Constat : 5 composants « partagés » importent des server actions colocalisées à des routes. — Impact : renommer une route casse des composants partagés ; frontière `components/` non fiable. — Reco : colocaliser ces composants près de leur route, ou passer l'action en prop. — Effort : S
- 🟡 **Aucun `import "server-only"` sur les modules sensibles** — Preuve : grep `server-only` = 0 ; `lib/supabase/admin.ts:3-5` se protège par commentaire seul (idem `email/resend.ts`, `security/secret.ts`, `vault/audit.ts`). — Impact : un refactor peut importer `createAdminClient` dans un composant client sans erreur de build (recoupe B12). — Reco : ajouter `import "server-only"` en tête de ces modules. — Effort : S
- 🟡 **Constantes de même connaissance dupliquées 5-6×** — Preuve : listes MIME dans `lib/vault/upload.ts:1`, `lib/photos/limits.ts:9`, `api/inbound-email/route.ts:8`, `api/.../import-reservation/route.ts:5`, `settings/cover-upload.tsx:13` ; tailles max redéfinies (`10*1024*1024` dans upload.ts:9 et photos/limits.ts:7). — Reco : `lib/uploads/constants.ts` partagé. — Effort : S
- 🟡 **Dérive `CLAUDE.md` ↔ code** — Preuve : `CLAUDE.md` annonce `lib/encryption/`, RHF+Zod comme standard (réel : 3 formulaires sur ~25), npm et « tests différés » vs pnpm + 63 tests + CI. — Impact : les futures sessions LLM appliquent des conventions périmées. — Reco : mettre `CLAUDE.md` à jour. — Effort : S
- 🔵 **2 cycles de dépendances type-only dans l'i18n** — Preuve : madge → `messages/en.ts > index.ts`, `index.ts > es.ts` (types effacés à la compilation). — Reco : extraire `PartialMessages` dans un `types.ts`. — Effort : S

**Top 3 actions** : (1) `import "server-only"` sur les 5 modules sensibles — S ; (2) mettre `CLAUDE.md` à jour — S ; (3) rapatrier les composants à imports remontants — S.

---

### A2 — Découpage des composants — 14 / 20

Frontière serveur/client bien tenue : 35 pages RSC fetchent côté serveur, les 88 fichiers `'use client'` sont des feuilles interactives, le seul contexte (`I18nProvider`) est minimal et mémoïsé, pas de prop drilling ≥ 3 niveaux. La faiblesse : une famille de « pages-client » cumule les trois signaux God component, et un contrôle UI (sélecteur de fuseau) est dupliqué 9 fois.

**Findings**
- 🟡 **God components (5 fichiers de 320-477 l. cumulant formulaire + liste + logique annexe)** — Preuve : `budget/expenses-client.tsx` (477 l., 10 props l.53-63, 7 `useState`, export CSV embarqué l.134-171) ; `photos/photos-client.tsx` (356 l., pipeline upload + galerie + visionneuse maison) ; `lodging/lodging-client.tsx` (355), `checklist/checklist-client.tsx` (338), `events/import/import-client.tsx` (321). — Impact : évolution laborieuse, testabilité unitaire quasi nulle. — Reco : extraire `ExpenseForm`/`ExpenseList`/`exportCsv`, `Lightbox`/`UploadPanel`. — Effort : M
- 🟡 **Sélecteur de fuseau horaire dupliqué 9×** — Preuve : `Intl.supportedValuesOf("timeZone")` reconstruit dans `profile-form.tsx:37`, `home-timezone-picker.tsx:11`, `settings-form.tsx:92`, `events/new/{activity,lodging,transport}-form.tsx`, `edit-form.tsx:41`, `import-client.tsx:41`, `trip-form.tsx:47`. — Reco : composant `<TimezoneSelect>` partagé. — Effort : S
- 🟡 **Deux générations de `<select>` coexistent** — Preuve : shadcn `ui/select` dans `transport-form.tsx:8-14` vs `<select>` HTML brut stylé main dans `expenses-client.tsx:259,286,300,323` et `photos-client.tsx:193-205`. — Impact : styles/accessibilité divergents. — Effort : S
- 🟡 **Props redondantes : `user.id` passé sous deux noms** — Preuve : `photos/page.tsx:55-56` (`myId` + `userId`), consommés séparément dans `photos-client.tsx:38-40`. — Reco : fusionner. — Effort : S
- 🔵 **Visionneuse photo réimplémentée hors design system** — Preuve : `photos-client.tsx:292-353` (`role="dialog"` manuel). Justifiable (plein écran), signalé pour cohérence. — Effort : M

**Top 3 actions** : (1) `<TimezoneSelect>` partagé — S ; (2) scinder `expenses-client.tsx` et `photos-client.tsx` — M ; (3) unifier les `<select>` sur le design system — S.

---

### A3 — Design & principes logiciels — 14 / 20

Très bonne hygiène fonctionnelle : séparation pur/impur nette dans `lib/` (balances, datetime, fuzzy, status… sans I/O), fetchs isolés avec timeout + cache, étage de types métier propre (`types/database.ts` importé dans 10 fichiers seulement). YAGNI respecté. La dette se concentre sur un point : la connaissance « qui a quel rôle sur ce voyage » n'a pas de fonction dédiée.

**Findings**
- 🟡 **Pas de couche d'accès pour l'appartenance au voyage : requête rôle réécrite 39×** — Preuve : `.from("trip_participants")` ×39 dans `app/` (`trips/[tripId]/page.tsx:46`, `settings/page.tsx:29`, `budget/page.tsx:49`, `events/[eventId]/page.tsx:60`…) ; aucun helper `getTripMembership`/`requireTripRole`. — Constat : RLS reste le filet (pas une faille), mais la règle des rôles est dupliquée ; partiellement assumé (PHIL-Q54 n'a factorisé que `requireUser`). — Impact : faire évoluer la matrice de rôles = toucher des dizaines de fichiers. — Reco : `lib/trips/membership.ts`. — Effort : M
- 🟡 **Schémas Zod client et serveur écrits deux fois** — Preuve : regex WhatsApp identique `settings-form.tsx:45` et `settings/actions.ts:95` ; règles nom/dates dupliquées `trip-form.tsx:24-27` vs `trips/new/actions.ts:23-26`. — Impact : divergence silencieuse déjà amorcée (messages FR en dur côté client vs `t()` côté serveur). — Reco : schéma partagé par formulaire. — Effort : M
- 🟡 **Écritures secondaires non vérifiées (échecs avalés)** — Preuve : `events/new/actions.ts:137-142` (update `trip_ideas`→SCHEDULED non vérifié), `horloges/actions.ts:27`. — Impact : incohérences de données silencieuses. — Reco : vérifier `error` et logger. — Effort : S
- 🟡 **Résolution email→locale par scan complet des users via service role** — Preuve : `participants/actions.ts:41-44` (`admin.auth.admin.listUsers({ perPage: 1000 })` puis `find()`). — Constat : O(tous les users), fragile au-delà de 1000. — Reco : requête `profiles` par email ou RPC ciblée. — Effort : S
- 🔵 **Appels OSRM séquencés dans le rendu RSC** — Preuve : `ideas/page.tsx:92-103` (un `getTravelMinutes` par idée localisée), atténué par cache 24 h + timeout 3 s. — Effort : M

**Top 3 actions** : (1) `lib/trips/membership.ts` + adoption — M ; (2) schémas Zod partagés — M ; (3) vérifier/logger les écritures secondaires — S.

---

### A4 — Qualité du code — 15 / 20

Hygiène remarquable sur 29 300 LOC : 0 `any`/`@ts-ignore`, 0 `catch` vide, 0 `TODO`/`FIXME` sauvage, 14 `biome-ignore` tous justifiés, commentaires « pourquoi » reliés aux tickets. Les défauts : un bloc de duplication massif (les 3 créations d'événement), ~20 messages FR en dur contredisant la promesse i18n, logger sous-adopté, code mort explicite.

**Findings**
- 🟡 **Duplication ~330 l. : les 3 actions de création d'événement sont des quasi-clones** — Preuve : `events/new/actions.ts` — `createActivityEvent` (l.25-149), `createLodgingEvent` (l.151-256), `createTransportEvent` (l.258-355), même séquence ; message d'erreur « …capitaine ou éditeur… » copié 5× (`:130,247,348` + `ideas/new/actions.ts:103` + `import/actions.ts:146`). — Reco : `createEvent(kind, schema, buildRow)`. — Effort : M
- 🟡 **~20 messages utilisateur FR en dur malgré la « traduction 100 % »** — Preuve : `events/[eventId]/actions.ts:139,157,166,177,185,205,225,235,249,259,285` ; `vault/[documentId]/actions.ts:72,84` ; `budget/actions.ts:20`. — Constat : contredit PHIL-Q37 (« plus aucune exception ») ; ces chaînes ne passent jamais par `t()`. — Reco : basculer sur `getT()`. — Effort : S
- 🟡 **Logger structuré adopté à ~20 %** — Preuve : `lib/observability/logger.ts` importé par 4 fichiers ; 17 `console.error/log` directs ailleurs ; pseudo-audit `console.log("[audit] event…")` `events/[eventId]/actions.ts:107,289`. — Reco : router vers le logger. — Effort : S
- 🟡 **Code mort** — Preuve : `demo-animations/page.tsx:3-4` (« Page TEMPORAIRE… À supprimer ») accessible en prod derrière l'auth, aucun ticket ; `components/trips/tab-placeholder.tsx` importé nulle part. — Reco : supprimer. — Effort : S
- 🟡 **Nommage : shadowing de `t` et snake_case fuitant dans les DTO client** — Preuve : `ideas/page.tsx` (`const t = await getT()` masqué l.242 et l.159) ; types mixtes `paid_by`/`amountPrimary` (`expenses-client.tsx:21-34`). — Reco : renommer, normaliser en camelCase au mapping. — Effort : S
- 🔵 **Styles de « pill » quadruplés** — Preuve : `ideas/page.tsx:219-267`. — Reco : composant `FilterPill`. — Effort : S

**Top 3 actions** : (1) passer les ~20 messages sur `t()` — S ; (2) factoriser les 3 créations d'événement — M ; (3) généraliser le logger + supprimer le code mort — S.

---

### A5 — Couverture des tests (quantité) — 12 / 20

Infrastructure complète et récente (Vitest + coverage + seuils, Playwright, CI). Les 63 tests unitaires passent ; la couverture **du périmètre mesuré** est bonne (90 % stmts / 79 % branches) mais ce périmètre est de 11 fichiers = ~2 % du code total. Point fort décisif (pèse double ici) : `scripts/verify-rls.ts` est un vrai test de sécurité multi-utilisateurs (~28 assertions, 3 users, les 5 règles critiques + partage ciblé E09). Le périmètre restreint est documenté (PHIL-Q38/Q56) — assumé — mais les zones les plus dangereuses restent sans test.

**Findings**
- 🟠 **Zones critiques à données sensibles sans aucun test** — Preuve : `lib/account/deletion.ts:18-118`, `lib/vault/watermark.ts:48-72`, `lib/webauthn/vault-session.ts:37-59`, `app/api/documents/[id]/view/route.ts` — aucune n'apparaît dans `tests/` ni `vitest.config.ts:21-33`. — Impact : une régression dans `deleteAccount` (service role, RLS ne protège pas) détruit des données réelles sans détection. — Reco : tests purs de `watermarkPdf`/`canWatermark` et sign/verify de `vault-session` (S), intégration de `deleteAccount` sur base jetable (M). — Effort : M
- 🟡 **31 fichiers de server actions + 10 routes API sans test applicatif** — Preuve : `grep -rl '"use server"'` → 31 ; `find app/api -name route.ts` → 10. — Impact : les régressions métier ne sont retenues que par RLS. — Reco : tests ciblés sur dépenses/invitations/partage. — Effort : M
- 🟡 **Seuils de couverture globaux, pas par fichier** — Preuve : `vitest.config.ts:34` ; `lib/budget/rates.ts` à **47 % lignes** passe (compensé par les fichiers à 100 %). — Reco : `perFile: true`. — Effort : S
- 🟡 **Le job CI `rls` ne s'exécute pas** — Preuve : `.github/workflows/ci.yml` — le job `rls` est conditionné à la présence des secrets `SUPABASE_*` (non fournis au dépôt, cf. mémoire projet) ; la seule vérification de sécurité automatisable reste 100 % manuelle. — Reco : provisionner un projet Supabase de test + secrets. — Effort : S
- 🔵 **E2e authentifié écarté volontairement (assumé/documenté)** — Preuve : `playwright.config.ts` + TODO.md:801 (OAuth Google impossible sans backdoor) — non re-pénalisé.
- 🔵 **`verify-rls` ne couvre pas toutes les tables** — Preuve : rien sur `trip_ideas`, `trip_invitations`, `expenses`, `trip_photos`, `checklist_items`, `vault_access_log`. — Reco : étendre. — Effort : M

**Top 3 actions** : (1) tests `watermark` + `vault-session` + intégration `deleteAccount` — S/M ; (2) provisionner le job CI `rls` — S ; (3) seuils par fichier — S.

---

### A6 — Qualité des tests (×2) — 16 / 20

Sur ce qui existe, la qualité est nettement au-dessus de la moyenne : chaque test appelle la vraie fonction (zéro mock du sujet testé, zéro tautologie, zéro snapshot), asserte des valeurs précises, teste le comportement (tous survivraient à un refactor interne), et les noms décrivent le scénario. Le test de parité i18n (`i18n.test.ts:47-63`) est un vrai méta-test anti-typo ; `verify-rls.ts` asserte les **effets** par relecture croisée après chaque action.

**Exercice de mutation (5 tests)** : 4/5 détectées, 1 partielle — `balances` (parts 2/1) ✓, `datetime` (minuit Maurice) ✓, `trip-status` bornes ✓, `checkBearer` fail-closed ✓, `sortTrips` départage intra-groupe ✗ (un seul voyage passé dans le jeu).

**Findings**
- 🟡 **`sortTrips` : départage intra-groupe non exercé** — Preuve : `tests/unit/trip-status.test.ts:34-43` vs `lib/trips/status.ts:38-41` (non couvertes). — Reco : 2 voyages par groupe. — Effort : S
- 🟡 **`tripStatus` compare la date UTC, pas locale, sans test** — Preuve : `lib/trips/status.ts:14,19` (le commentaire dit « locale » mais `toISOString()` = jour UTC). — Impact : un voyage peut rester « à venir » le matin du départ à l'est d'UTC. — Reco : verrouiller le comportement par test. — Effort : S
- 🟡 **`sortTrips` dépend de l'horloge réelle** — Preuve : `tests/unit/trip-status.test.ts:36-40` (dates sentinelles) alors que `tripStatus` accepte un paramètre `today` non exposé par `sortTrips`. — Effort : S
- 🔵 **Cas limite non testé : total de parts = 0** — Preuve : `lib/budget/balances.ts:30`. — Effort : S
- 🔵 **E2e sur env factice en CI** — Preuve : `ci.yml` (placeholders Supabase) — les 8 e2e valident uniquement le chemin non authentifié, ce qui est leur périmètre déclaré.

**Top 3 actions** : (1) étoffer `sortTrips` + fixer le fuseau de `tripStatus` — S ; (2) couvrir les branches restantes — S ; (3) test de mutation « qui doit quoi » à 3+ dépenses — S.

---

### A7 — Dépendances & supply chain — 12 / 20

Posture outillée très bonne — lockfile pnpm commité + `--frozen-lockfile` en CI, Dependabot actif (npm + github-actions, bumps groupés), pnpm 10 bloque par défaut les scripts d'install tiers, couplage exemplaire (`@supabase/*` isolé dans `lib/supabase/`). La note est plafonnée par les vulnérabilités **de production** sur le framework.

**Findings**
- 🟠 **`next@16.2.2` épinglé avec 8 vulnérabilités *high* en prod (fix ≥ 16.2.5)** — Preuve : `package.json:43` (version exacte) ; `pnpm audit` : 16 vulns (8 high dont 2 bypass middleware/proxy App Router, SSRF, 3 DoS ; 6 moderate ; 2 low), toutes côté prod. — Constat : le gating d'auth repose précisément sur le proxy/middleware ; un bypass est le pire scénario pour ce design (atténué par la défense en profondeur : 401 dans les handlers + RLS). — Reco : bump ≥ 16.2.5, préférer `~16.2.5` au pin exact. — Effort : S
- 🟡 **CLI `shadcn` en dépendance de production, jamais importée** — Preuve : `package.json:50` ; grep = 0 import. — Reco : retirer (usage via `pnpm dlx`) ou passer en devDep. — Effort : S
- 🟡 **`@types/node@^20` alors que le runtime est Node 24** — Preuve : `package.json:63` vs `.nvmrc`=24, `engines ">=22 <25"`, CI Node 24. — Reco : `@types/node@^24`. — Effort : S
- 🟡 **`sharp` en devDependency, importé nulle part** — Preuve : `package.json:71` ; grep = 0. — Constat : usage implicite dev par `next/image` (hypothèse), inutile sur Vercel. — Reco : documenter ou supprimer. — Effort : S
- 🔵 **depcheck : faux positifs** — `tailwindcss`/`tw-animate-css` importés via `app/globals.css`, `@tailwindcss/postcss` via `postcss.config.mjs` ; seuls `shadcn` et `sharp` sont réellement orphelins.
- 🔵 **Pas de champ `packageManager`** — Preuve : grep = 0 ; CI épingle pnpm 10. — Reco : `"packageManager": "pnpm@10.x"`. — Effort : S

**Top 3 actions** : (1) bump `next` ≥ 16.2.5 — S ; (2) sortir `shadcn` de la prod, trancher `sharp` — S ; (3) `@types/node@24` + `packageManager` — S.

---

### A8 — Maintenabilité & évolutivité — 15 / 20

Projet remarquablement traçable : **zéro** `TODO`/`FIXME` dans le code, toute la dette dans `TODO.md` (tickets datés + notes de décision), 52 migrations ordonnées avec types régénérés, `.env.example` exactement aligné sur les 15 `process.env.*` du code, README de setup exact. Une future session démarre en < 30 min. Point faible : « ajouter un type d'événement » éparpille l'enum.

**Findings**
- 🟡 **Ajouter un type d'événement touche ~24 fichiers, sans point d'extension central** — Preuve : enum Postgres `20260703083204_trip_events.sql:4` + 19 fichiers avec les littéraux `TRANSPORT|LODGING|ACTIVITY` + 3 fichiers i18n. Atténuant : `EVENT_TYPE_LABELS` est un `Record<EventType,…>` typé-exhaustif (`lib/events/types.ts:6`). — Reco : config centrale par type (label i18n, icône, couleur, catégorie budget). — Effort : M
- 🟡 **Dérive documentaire : `CLAUDE.md` contredit l'état réel** — Preuve : § « Différé volontairement » (tests, CI) et § Commandes (`npm run…`) vs CI complète + 63 tests + pnpm ; backlog A07/A08 listés différés alors que réalisés. — Impact : une future session suit des instructions périmées. — Reco : mettre à jour + clore A07/A08. — Effort : S
- 🟡 **Double source de vérité pour les libellés de types d'événement** — Preuve : `lib/events/types.ts:6-10` (FR en dur) coexiste avec les clés i18n `calendar.ts:96`. — Reco : mapper vers des clés i18n. — Effort : S
- 🔵 **Configuration bien externalisée** — aucune URL/secret en dur, constantes nommées (`VAULT_SESSION_MINUTES`). Point fort.
- 🔵 **Pas d'ADR formels** — les décisions vivent dans `CLAUDE.md` (« Pourquoi ces choix ») et les notes de tickets, ce qui en tient lieu à cette échelle.

**Top 3 actions** : (1) synchroniser `CLAUDE.md` — S ; (2) config centrale par type d'événement — M ; (3) unifier `EVENT_TYPE_LABELS` sur i18n — S.

---

### A9 — Cohérence transversale — 12 / 20

Plusieurs axes exemplaires (mutations 100 % server actions, zéro `window.confirm`/`alert`, alias `@/` quasi uniforme, identifiants de code 100 % anglais). Mais c'est la catégorie où la dette est la plus dense : ≥5 shapes de retour d'actions, 3 mécaniques de formulaire, toasts limités au budget, helpers de dates court-circuités, charte couleur écrite de 3 façons.

**Findings**
- 🟡 **≥5 shapes de retour de server actions, dont 2 dans le même fichier** — Preuve : `{status:"idle"|"success"|"error"}` (`participants/actions.ts:13`), variante sans `success` (`events/new/actions.ts:20-23`), `{ok:boolean}` coexistant avec `{status}` dans `budget/actions.ts:25,28`, `Promise<void>` fire-and-forget (`checklist/actions.ts:62`), `Promise<boolean>` (`explorer/actions.ts:9`), succès par `redirect()`. — Reco : type `ActionState` unique. — Effort : M
- 🟡 **3 mécaniques de formulaire pour le même besoin** — Preuve : RHF+zodResolver ×3, `useActionState` ×11, réimplémentation manuelle `useState`+`startTransition`+`FormData` ×~8 (`activity-form.tsx:40-53`, `invite-form.tsx:35-45`…). — Reco : standard `useActionState` documenté. — Effort : M
- 🟡 **Notifications : toasts uniquement dans budget, inline partout ailleurs** — Preuve : `toast.error` seulement `expenses-client.tsx:459`, `equilibre-client.tsx:142` ; `<p className="text-bordeaux">{state.message}</p>` ×85 ailleurs ; échec muet pour les actions `Promise<void>` (`photos-client.tsx:280`). — Reco : règle unique. — Effort : M
- 🟡 **Dates : helpers centralisés court-circuités** — Preuve : `date-fns` importé direct dans 14 fichiers, `date-fns-tz` dans 9, `new Date(` ×59 dont manipulations manuelles (`layout.tsx:57-58`, `expenses-client.tsx:411`). — Impact : les bugs de fuseau (risque n°1 du domaine) ne sont pas cantonnés. — Reco : router via un module de formatage. — Effort : M
- 🟡 **Charte couleur écrite de 3 façons** — Preuve : tokens `text-bordeaux` ×85 vs `accent-[#6e1f2e]` (`expenses-client.tsx:362`) vs hex JS (`map/page.tsx:14-16`, 47 occurrences). — Reco : `lib/theme/colors.ts` + token `accent-bordeaux`. — Effort : S
- 🟡 **Mélange FR/EN dans les segments d'URL et valeurs de domaine** — Preuve : `/conseils`, `/horloges`, `/budget/depenses` parmi ~20 segments EN ; clés `en_cours/a_venir/passe` (`layout.tsx:11-16`). — Reco : trancher la convention et la consigner. — Effort : S
- 🔵 **Conversion snake→camel non systématisée à la frontière** — Preuve : objets client mixtes (`expenses-client.tsx:21-34`). — Effort : M

**Top 3 actions** : (1) type `ActionState` unique — M ; (2) standard formulaire `useActionState` — M ; (3) palette JS centralisée — S.

---

### B10 — Authentification & contrôle d'accès (×3) — 12 / 20

Socle solide : RLS active sur toutes les tables exposées, aucune policy `USING (true)`, fonctions `security definer` du schéma `private` bornées, buckets Storage sans lecture anonyme, WebAuthn dans les règles de l'art (challenge cookie httpOnly 5 min supprimé après usage, origine + rpID vérifiés, `userVerification` requis, compteur anti-clonage), session coffre HMAC/SameSite=strict/15 min. Deux écarts empêchent une note haute.

**Findings**
- 🟠 **Escalade verticale : un EDITOR exécute des opérations OWNER-only via PostgREST direct** — Preuve : `supabase/migrations/20260703075238_rls_trips.sql:51-56` (`trips_update_owner_editor` autorise l'`UPDATE` de **toute la ligne** `trips` à OWNER *et* EDITOR) vs `settings/actions.ts:38-41` (`setPublicSharing` restreint à OWNER dans le code seul) et `:273-279` (`setTripArchived`, dont le commentaire admet « la restriction plus fine se fait ici »). — Constat : `public_token`, `archived_at`, `email_alias`, `created_by` ne sont protégés qu'applicativement ; un EDITOR détient un JWT valide et peut appeler l'API REST Supabase directement. — Impact : un EDITOR active le partage public (`public_token`) et expose l'itinéraire sur `/p/{token}` sans être capitaine (blast radius borné : co-voyageur de confiance, données de voyage). Contredit le principe `CLAUDE.md` « RLS plutôt que contrôles applicatifs ». — Reco : trigger `BEFORE UPDATE` refusant ces colonnes hors OWNER, ou RPC `security definer` dédiées. — Effort : M
- 🟠 **L'email invité n'est pas vérifié à l'acceptation** — Preuve : `app/(auth)/invitations/[token]/actions.ts:61-65` : insertion de `trip_participants` avec l'utilisateur connecté courant, aucune comparaison `user.email === invitation.invited_email` ; token valable 30 jours (`20260703112724_trip_invitations.sql:14`). — Constat : modèle « lien magique » assumé (commentaire l.16-18). — Impact : quiconque obtient le lien (email transféré, fuite) rejoint le voyage et accède aux documents `scope=TRIP` — pour une app à pièces d'identité, l'accès n'aurait pas dû être un pur porteur-de-jeton. — Reco : exiger `user.email === invited_email` à l'acceptation ; réduire l'expiration. — Effort : S
- 🟡 **Acceptation d'invitation : contrôle « déjà utilisée » non atomique** — Preuve : `invitations/[token]/actions.ts:43-74` (lecture `accepted_at` puis `update` séparé). — Impact : faible (la PK `(trip_id,user_id)` empêche le double participant ; risque limité à un double `accepted_at`). — Reco : `update … where accepted_at is null returning`. — Effort : S
- 🔵 **Webhook inbound-email : expéditeur non vérifié cryptographiquement** — Preuve : `api/inbound-email/route.ts:89-105` (appartenance sur `payload.from` falsifiable ; la vraie barrière est le secret partagé comparé à temps constant `:57-63`). — Reco : exiger un verdict SPF/DKIM si le provider l'expose. — Effort : S

**Top 3 actions** : (1) lier le token d'invitation à `invited_email` — S ; (2) verrouiller en base les colonnes OWNER-only de `trips` — M ; (3) rendre l'acceptation atomique — S.

---

### B11 — Sécurité applicative OWASP (×3) — 12 / 20

Bonne hygiène : aucune requête SQL brute (PostgREST paramétré), aucun `dangerouslySetInnerHTML`, validation Zod **côté serveur** systématique (jamais de `...body` spread → pas de mass assignment), en-têtes de sécurité complets avec CSP dédiée durcie pour le viewer de documents, protection open-redirect aux deux points d'entrée, CSRF couvert par les server actions + SameSite. Le plafond vient d'un SSRF via l'optimiseur d'images et d'un rate limiting inerte par défaut.

**Findings**
- 🟠 **SSRF via l'optimiseur d'images (`remotePatterns` wildcard + URL de couverture contrôlée)** — Preuve : `next.config.ts:53` (`{ protocol:"https", hostname:"**" }`) + `settings/actions.ts:214-219` (`setCoverFromUrl` accepte toute URL https). — Constat : `/_next/image?url=<https arbitraire>` fait fetcher l'URL **côté serveur** par l'optimiseur. — Impact : SSRF aveugle — sonde de services HTTPS internes, port-scan par timing, abus de bande passante Free (gravité bornée : réponse contrainte aux images). — Reco : restreindre `remotePatterns` à une allowlist (`lh3.googleusercontent.com` + domaine Supabase), héberger les couvertures par upload. — Effort : M
- 🟡 **Uploads : type vérifié sur MIME déclaré, pas sur magic bytes** — Preuve : `lib/vault/upload.ts:27-35`, `vault/new/actions.ts:14` (validation de `file.type`/`mimeType` client). — Constat : atténué (bucket `allowed_mime_types` `20260703090211:12`, viewer `nosniff` + `CSP default-src 'none'`). — Reco : vérifier les magic bytes à l'enregistrement. — Effort : M
- 🟡 **Rate limiting inerte hors Upstash** — Preuve : `lib/security/rate-limit.ts:24-27` (retourne `true` sans Redis) ; seul `inbound-email/route.ts:65` l'appelle. — Constat : `import-reservation` (Gemini), `geo/search` (Photon), invitations, upload non limités. — Impact : un user authentifié peut épuiser les quotas Free ou spammer des invitations. — Reco : brancher `rateLimitOk` + provisionner Upstash. — Effort : M
- 🟡 **Framework avec CVE *high* sur le composant qui garde les routes** — Preuve : `package.json:43` (`next@16.2.2`), `proxy.ts` → `lib/supabase/middleware.ts`. — Constat : atténué (chaque action/route revérifie `getUser()` + RLS). — Reco : Next ≥ 16.2.5. — Effort : S
- 🔵 **Import Gemini : données envoyées à Google** — Preuve : `lib/import/reservation.ts:6-9,80-91` (caveat documenté, limité aux confirmations, jamais le coffre). — Effort : S

**Top 3 actions** : (1) restreindre `images.remotePatterns` — M ; (2) brancher le rate limiting + Upstash — M ; (3) Next ≥ 16.2.5 — S.

---

### B12 — Secrets & protection des données (×3) — 12 / 20

Gestion des secrets exemplaire : aucun secret en code/historique, `.env.example` aligné, `.gitignore` couvre `.env*`, service role strictement serveur, seules variables `NEXT_PUBLIC_*` sensibles = clé publique VAPID (destinée à l'être). L'audit log est non contournable sur le chemin de lecture (bucket sans SELECT anonyme → toute lecture VAULT passe par `/api/documents/[id]/view` qui logge), la purge de rétention et la suppression de compte effacent réellement blobs + lignes. Le plafond vient de l'écart promesse/code sur le « chiffrement » et d'un audit best-effort.

**Findings**
- 🟠 **« Chiffrement » du coffre promis mais non implémenté ; n° de pièce d'identité en clair** — Preuve : `CLAUDE.md` (« Sécurité forte sur le coffre : **chiffrement**… ») vs `vault/new/actions.ts:68-71` (`metadata.document_number` — n° de passeport/CNI — inséré en clair dans `documents.metadata`) ; le filigrane n'est appliqué qu'à la lecture (`api/documents/[id]/view/route.ts:70-84`), pas au repos. — Constat : les blobs et le n° ne subissent aucun chiffrement applicatif ; seule l'encryption-at-rest infra Supabase (non contrôlée par l'app) existe. Les protections réelles (RLS, bucket privé, lecture service-role, audit, watermark, WebAuthn) sont fortes mais ne couvrent pas la promesse. — Impact : un accès base (fuite service-role, incident Supabase) expose les n° de pièces en clair ; écart doc/code sur une donnée à sensibilité maximale. — Reco : chiffrer `document_number` par enveloppe applicative, ou réaligner la doc sur le modèle réel. — Effort : L
- 🟡 **Journal d'audit du coffre en best-effort (erreurs avalées)** — Preuve : `lib/vault/audit.ts:19-38` (try/catch, échec → `console.error` seul) ; `api/documents/[id]/view/route.ts:86-92` (réponse renvoyée quoi qu'il arrive). — Impact : traçabilité non garantie (non-répudiation affaiblie). — Reco : refuser la livraison si l'audit d'un accès VAULT échoue, ou file de reprise. — Effort : M
- 🟡 **PII/quasi-PII dans les logs et logger contourné** — Preuve : `events/[eventId]/actions.ts:107,289` (`console.log` brut avec `user.id`), `lib/import/reservation.ts:93` (log du corps Gemini), `participants/actions.ts:270` (log de `sendError.message`, peut contenir l'email). — Reco : router via `logger`, ne jamais logger de corps tiers/erreur email. — Effort : S
- 🔵 **DOWNLOAD non distingué de VIEW dans l'audit** — Preuve : l'enum et `vault/activity/page.tsx:54` prévoient `DOWNLOAD` mais aucun chemin serveur ne le logge (viewer `inline`). — Reco : endpoint de téléchargement dédié, ou documenter. — Effort : S

**Top 3 actions** : (1) chiffrer `document_number` ou réaligner la doc — L ; (2) rendre l'audit VAULT bloquant sur échec — M ; (3) centraliser les logs via `logger` — S.

---

### C13 — Performance frontend — 14 / 20

Architecture client/serveur exemplaire : toutes les pages sont des Server Components, les 88 `'use client'` sont des feuilles, les deux cartes Leaflet et tesseract.js passent par des imports dynamiques, pdf-lib absent des bundles client. Points perdus : catalogue i18n trilingue dans le bundle, API externes bloquantes au rendu sans Suspense, lignes `select("*")` sérialisées en props.

**Findings**
- 🟡 **Catalogue i18n trilingue entier dans le bundle client + double envoi** — Preuve : `components/i18n/provider.tsx:5-8` (`import { messages }` + valeur par défaut `messages.fr`), `app/layout.tsx:10,55` ; chaînes espagnoles présentes dans le chunk client (~150 Ko avant gzip). Le commentaire du provider (« le serveur ne sérialise que la langue courante ») est contredit par l'import statique. — Reco : valeur par défaut `null` + `import type` seul dans le provider. — Effort : S
- 🟡 **API externes bloquantes au rendu, sans Suspense ni loading segmenté** — Preuve : `trips/[tripId]/page.tsx:87-113` (séquence `await ensureTripCoords` → `getDailyForecast` → `getTravelMinutes`), timeouts 4 s + 3 s ; zéro `<Suspense>` dans le repo, aucun `loading.tsx` sous `trips/[tripId]/`. — Impact : jusqu'à ~7 s de TTFB sans feedback sur la page la plus visitée en cache froid. — Reco : streaming sous `<Suspense>` + `loading.tsx` ; a minima paralléliser météo/OSRM. — Effort : M
- 🟡 **Lignes complètes `select("*")` sérialisées en props client** — Preuve : `trips/[tripId]/page.tsx:42` (`trip_events.select("*")`) → `calendar-days.tsx` (client) ; 28 occurrences `select("*")`. — Impact : payloads RSC gonflés (notes jusqu'à 2000 car.). — Reco : projections de colonnes sur les pages listes. — Effort : M
- 🟡 **Requêtes dupliquées layout/page sans `React.cache()`** — Preuve : `layout.tsx:30` + `page.tsx:51-57` (trip fetché 2×) ; `getUser()` sur 90 sites (middleware + layouts + page = 3-4 allers-retours/navigation). — Impact : 100-400 ms de latence structurelle. — Reco : envelopper `getUser`/trip dans `React.cache()`. — Effort : S
- 🔵 **Tout est dynamique (ƒ), zéro page statique** — `/legal`, `/privacy`, `/login` pourraient être statiques ; négligeable à cette échelle. — Effort : S
- 🔵 **Bonnes pratiques constatées** — fonts `next/font` avec subsets ; `<img>` bruts uniquement pour les sources authentifiées (justifiés, `loading="lazy"`) ; `next/image` + `sizes`/`priority` pour les couvertures ; service worker discipliné par type.

**Top 3 actions** : (1) purger l'i18n du bundle client — S ; (2) Suspense/streaming autour de météo + trajet — M ; (3) `React.cache()` sur getUser/profil/trip — S.

---

### C14 — Performance backend & base de données — 14 / 20

Socle SQL remarquablement propre : toutes les policies RLS utilisent `(select auth.uid())` + helpers `security definer` STABLE dont les lookups sont couverts par des index (le piège quadratique Supabase est **évité partout**). Zéro N+1 sur les écrans (jointures embarquées), suppressions cascadées en base, RPC atomique pour les dépenses. Points perdus : pagination quasi absente, aucun cache serveur, over-fetching, boucles N+1 dans crons et purge de compte.

**Findings**
- 🟡 **Aucune pagination sur les listes serveur** — Preuve : seuls `.limit()` réels = `vault/activity/page.tsx:49` (200) ; aucun `.range()`. `trip_events`, `expenses`, `documents`, `trip_photos`, `trip_ideas` ramenés en entier. — Constat : volumes bornés par le domaine. — Reco : garde-fou `.limit(500)` par voyage. — Effort : M
- 🟡 **Zéro cache serveur : auth revalidée 3-4×/requête** — Preuve : aucun `React.cache()`/`unstable_cache` ; `getUser()` dans middleware + chaque layout/page (90 sites) ; profil re-fetché à chaque page (`select("*")`). — Reco : `React.cache()` par render, validation JWT locale. — Effort : S
- 🟡 **Purge de compte en N+1 séquentiel** — Preuve : `lib/account/deletion.ts:44-70` (boucle par voyage), `:77-91` (2 requêtes **par événement** : 200 événements ≈ 400 requêtes). — Impact : risque de dépasser le timeout, purge à moitié faite (recoupe D16). — Reco : réassignation par lot (`update … in (…)`), ou fonction Postgres. — Effort : M
- 🟡 **Crons en boucles N+1 séquentielles (assumé/documenté)** — Preuve : `cron/event-reminders/route.ts:41-68` (par événement → participants → push par user) ; `maxDuration=60` justifié l.11-12. — Reco : batcher les lookups si le nombre de voyages actifs grossit. — Effort : M
- 🔵 **Filigrane pdf-lib à chaque vue : mesuré et dans les clous** — 52 ms/PDF 3 pages (TODO.md:221), fichiers ≤ 10 Mo, `no-store` cohérent — assumé/documenté.
- 🔵 **`calendar.ics` sans en-tête de cache** — `calendar.ics/route.ts:3` (`force-dynamic`, `select("*")`, pas de `Cache-Control`). — Reco : `max-age=3600` + projection. — Effort : S
- 🔵 **Index : très bonne couverture, trous mineurs sur FK secondaires** — `trip_events.created_by`, `expenses.event_id`, `trip_photos.event_id`, `checklist_items.assigned_to` non indexés (requêtes rares sur petites tables). — Effort : S
- 🔵 **Points forts** — RLS initplan indexée (pas de policy quadratique), zéro N+1 écrans, suppression de voyage 100 % cascade DB, RPC atomique dépenses, tous les fetchs externes avec cache Next + `AbortSignal.timeout`.

**Top 3 actions** : (1) `React.cache()` sur getUser/profil/trip — S ; (2) réassignation par lot dans `deletion.ts` — M ; (3) garde-fous `.limit()` + projections sur chemins chauds — M.

---

### D15 — Gestion des erreurs & résilience — 14 / 20

Socle solide et travaillé : boundaries `error.tsx` + `global-error.tsx`, `AbortSignal.timeout` sur **tous** les fetchs externes avec dégradation propre, compensation blob→DB sur tous les uploads, double-submit largement protégé (73 `disabled={pending}`), mode offline abouti (sync Dexie transactionnelle, maintenance d'expiration, bannière, resync). Défauts mineurs : pas de `not-found.tsx`, erreurs DB rendues comme états vides, succès partiels silencieux dans l'import.

**Findings**
- 🟡 **Aucun `not-found.tsx` malgré 10+ appels `notFound()`** — Preuve : `find app -name not-found.tsx` = 0 ; appels dans `trips/[tripId]/layout.tsx:34`, `events/[eventId]/page.tsx:84`. — Impact : 404 Next brute (anglais, hors charte, sans navigation). — Reco : `app/not-found.tsx` dans le ton Phil. — Effort : S
- 🟡 **Les erreurs DB des pages listes sont rendues comme états vides** — Preuve : `vault/page.tsx:43-44` (`const { data } = …; const documents = (data ?? [])` — l'objet `error` ignoré) ; idem `trips/[tripId]/documents/page.tsx:49-59`, `lib/offline/sync.ts:12-34`. — Impact : en cas d'erreur DB, l'utilisateur voit « coffre vide » — panique possible, aucun réessai. — Reco : vérifier `error` et `throw` (attrapé par `error.tsx`). — Effort : M
- 🟡 **Succès partiels silencieux dans l'import** — Preuve : `events/import/actions.ts:151-165` (échec insert `documents` après création de l'événement : aucun message/log, redirect quand même), `:268` (`import_drafts` marqué `DONE` même si la copie a échoué). — Impact : événement créé sans sa confirmation, brouillon consommé avec pièce perdue. — Reco : vérifier chaque insert, ne marquer `DONE` qu'après succès. — Effort : S
- 🟡 **Une seule boundary loading/error pour toute la zone authentifiée** — Preuve : seuls `app/(app)/loading.tsx`, `app/error.tsx` ; `grep <Suspense` = 0. — Impact : une erreur dans un onglet remplace le shell entier du voyage. — Reco : `error.tsx` + `loading.tsx` au niveau `trips/[tripId]`. — Effort : S
- 🔵 **Course sur le quota photos (check-then-insert)** — Preuve : `photos/actions.ts:75-86` (pas de contrainte DB en filet). Tolérable à cette échelle. — Effort : M
- 🔵 **Merge JSONB `metadata` en lecture-modification-écriture** — Preuve : `events/[eventId]/actions.ts:71-98` (dernier écrivain gagne). Acceptable. — Effort : M

**Top 3 actions** : (1) vérifier `error` sur les pages listes + état erreur — M ; (2) `not-found.tsx` + boundaries `trips/[tripId]` — S ; (3) corriger les succès partiels d'import — S.

---

### D16 — Intégrité des données (×2) — 6 / 20

Le travail en base est d'excellente facture : CHECK exhaustifs, UNIQUE réfléchis (`document_shares_unique nulls not distinct`, `storage_path unique`, invitation unique/voyage/email), PK composites anti-doublons, triggers atomiques, RPC transactionnelle des dépenses, soft delete filtré dans **toutes** les lectures actuelles, `timestamptz` partout. Mais deux angles morts plafonnent la note, dont un 🔴 (barème : 🔴 plafonne la catégorie à 3/10 = 6/20) : la **destruction silencieuse des dépenses du groupe** à la suppression d'un compte, et les blobs Storage orphelins à la suppression d'un voyage.

**Findings**
- 🔴 **`ON DELETE CASCADE` sur `profiles` détruit des données du groupe — les soldes de la Bourse sont faussés silencieusement** — Preuve : `20260704165430_expenses.sql:9-10` (`paid_by`/`created_by … on delete cascade`), idem `checklist_items`, `polls`, `trip_photos`, `event_notes` ; `lib/account/deletion.ts:72-91` réassigne les **événements** au capitaine mais ne fait rien pour dépenses/photos/sondages/checklist. Contradiction interne : `expenses.sql:14-15` matérialise les bénéficiaires précisément « pour que les soldes restent stables même si l'équipage évolue ». — Impact : supprimer un compte (action RGPD légitime, `C06`) efface en cascade **toutes ses dépenses + les bénéficiaires** → les soldes du tricount de tout l'équipage changent silencieusement (dettes effacées ou créées, réconciliation faussée), sans avertissement ni trace. Perte de données irréversible. — Constat : classé 🔴 sur le critère « perte de données possible » du barème ; ce n'est **pas** une faille d'accès (déclenché par une action légitime, pas un exploit), d'où l'absence de brèche exploitable par un tiers. — Reco : réassigner `paid_by`/`created_by` à un compte fantôme « voyageur parti » (comme les événements le sont déjà), ou passer ces FK en `ON DELETE RESTRICT`/`SET NULL` et documenter la purge comme choix RGPD explicite avec avertissement à l'équipage ; a minima traiter `expenses` dans `deletion.ts`. — Effort : M
- 🟠 **Suppression d'un voyage : aucun nettoyage Storage (blobs orphelins à vie)** — Preuve : `settings/actions.ts:298-315` (`deleteTrip` = un seul `delete` sur `trips` ; le commentaire l.306-307 ne mentionne que les FK) ; les lignes cascadent mais **aucun** `storage.remove` pour `documents`/`photos`/`covers` ; aucun job de réconciliation (`grep .list(` storage = 0). — Impact : (1) rétention RGPD — billets/vouchers nominatifs conservés sans trace ni accès ; (2) épuisement du quota Supabase Free 1 Go. — Reco : lister les `storage_path` avant suppression et purger les 3 buckets ; ajouter au cron un balayage `storage.list()` vs table (blobs > 24 h sans ligne). — Effort : M
- 🟡 **`deleteAccount` : séquence longue non transactionnelle, erreurs ignorées** — Preuve : `lib/account/deletion.ts:27-111` (résultat de `storage.remove` ignoré l.27 puis lignes supprimées → blobs de pièces orphelins si le remove échoue). — Reco : vérifier le retour de `remove` ; logger chaque étape. — Effort : S
- 🟡 **Acceptation d'invitation en deux écritures non atomiques** — Preuve : `invitations/[token]/actions.ts:61-74` (insert participant puis update `accepted_at`, erreur ignorée). — Impact : limité (PK + unique en filet), mais état incohérent visible dans l'UI. — Reco : RPC `accept_invitation(token)`. — Effort : S
- 🟡 **Transfert de propriété en deux updates ordonnés (assumé/documenté)** — Preuve : `participants/actions.ts:144-165` (TODO.md:181 : un échec laisse deux OWNER, direction sûre). — Reco : RPC atomique à l'occasion. — Effort : S
- 🔵 **Le soft delete n'existe qu'applicativement** — Preuve : `20260703085219_rls_documents.sql` (aucune policy ne filtre `deleted_at`) ; toutes les lectures actuelles le font (100 % couvert) mais tout futur chemin qui l'oublie ressert un document supprimé. — Reco : ajouter `deleted_at is null` aux policies SELECT. — Effort : S
- 🔵 **Migrations : ordonnées, commentées, rejouables** — 52 fichiers horodatés, FK différée documentée, `on conflict do nothing` sur les backfills. Point fort.

**Top 3 actions** : (1) purge Storage à la suppression de voyage + balayage d'orphelins — M ; (2) traiter les dépenses/photos dans `deletion.ts` ou documenter — M ; (3) RPC `accept_invitation` — S.

---

### D17 — Observabilité & exploitation — 9 / 20

Deux vrais points forts : `vault_access_log` répond précisément à « qui a vu ce document et quand » (action, IP, user-agent, survit à la suppression du doc), et un logger JSON structuré existe. Mais il n'est branché qu'à **4 endroits** ; la quasi-totalité des chemins d'échec ne loggent rien ou du texte libre via `console.error`. Le test pratique du référentiel échoue : « hier soir impossible d'ajouter un document » **n'est pas reconstituable**. L'absence de Sentry est assumée (TODO.md:886) et non re-pénalisée ; c'est l'écart entre « les logs Vercel suffisent » et ce qu'ils contiennent réellement qui coûte.

**Findings**
- 🟠 **Le chemin d'ajout de document n'émet aucun log serveur en cas d'échec** — Preuve : `vault/new/actions.ts:50-52` (échec Zod → return sans log), `:88-93` (échec insert → cleanup + message générique, **zéro log**) ; seul le succès trace (`logVaultAccess UPLOAD` `:95-100`) ; le viewer renvoie 502 sans logger (`api/documents/[id]/view/route.ts:62-64`). — Impact : un ami signale « je n'arrive pas à ajouter mon passeport » → rien dans les logs Vercel, diagnostic à l'aveugle. — Reco : `logger.error("document_insert_failed", { userId, documentId, code })` (UUID seul, pas de PII) sur chaque branche d'échec. — Effort : S
- 🟡 **Crons semi-observables** — Preuve : `cron/document-expiry/route.ts:122-127` (compte-rendu dans le corps de réponse, que Vercel Cron ne consigne pas ; pas de `logger.*` ni try/catch global) ; `event-reminders/route.ts:157-160` (catch logge `cron_failed` **sans** message/stack). — Impact : un cron qui échoue en silence = alertes d'expiration de passeport jamais envoyées. — Reco : `logger.info("cron_done", résumé)` + `logger.error("cron_failed", { error })`. — Effort : S
- 🟡 **Les error boundaries loggent dans le navigateur de l'utilisateur** — Preuve : `app/error.tsx:20-22` et `global-error.tsx:52-54` sont `"use client"` : `logger.error(digest)` écrit dans la console du visiteur, jamais transmise. — Reco : route `/api/client-error` légère (ou attendre Sentry). — Effort : S
- 🟡 **Double système de logs** — Preuve : 4 appels `logger.*` vs ~15 `console.error` texte libre (`participants/actions.ts:270`, `vault/audit.ts:34`, `import/reservation.ts:93`) + 2 `console.log` pseudo-audit ; `lib/notifications/push.ts:50-56` avale les erreurs non-404/410 sans log. — Reco : migrer les `console.*` serveur vers `logger`. — Effort : S
- 🔵 **Pas de Web Vitals / analytics** — `grep @vercel/analytics` = 0 ; Sentry différé (assumé/documenté).
- 🔵 **Point fort : audit coffre exploitable** — `vault_access_log` + `vault/activity/page.tsx` ; best-effort assumé.

**Top 3 actions** : (1) logger toutes les branches d'échec documents/photos + viewer — S ; (2) logs structurés de fin/échec de cron — S ; (3) unifier `console.*` sur `logger` — S.

---

### E18 — DX & outillage — 10 / 20

DX quotidienne très bonne : README exact (pnpm, Node 24), `.env.example` exemplaire (aligné sur le code), `tsconfig` strict sans neutralisation, `next.config.ts` sans `ignoreBuildErrors`/`ignoreDuringBuilds` (vérifié absents), scripts complets, husky, CI GitHub Actions, deux seeds. Mais un seul projet Supabase sert dev/preview/prod (finding prévu par le référentiel) et `CLAUDE.md` contredit la réalité du repo.

**Findings**
- 🟠 **Une seule base Supabase partagée entre local, preview et production** — Preuve : `.env.example:10` (unique projet `xinbuahgscaydpkcamsl`) ; TODO.md:53 (« Env vars posées sur les 3 environnements Vercel + `.env.local` ») ; `scripts/verify-rls.ts:25-56` et `seed-demo-maurice.ts` créent des comptes (`@phil-app.test`) dans cette base via service role. — Impact : le dev local, les seeds et les tests RLS écrivent dans la base qui contient les documents d'identité réels ; une erreur de script (ou un `db reset` réflexe) détruit la prod (signal croisé B12). — Reco : second projet Supabase « dev » ou stack locale `supabase start`, clés distinctes par environnement. — Effort : M
- 🟡 **`CLAUDE.md` contredit le repo (npm/pnpm, CI, tests)** — Preuve : § « Commandes utiles » (`npm run…`, `npx tsx`) vs pnpm ; « Pas de CI ni de Sentry en v1 » et « différé : CI, tests Vitest/Playwright » vs `.github/workflows/ci.yml`, `vitest.config.ts`, `playwright.config.ts` ; backlog A07/A08 encore listés différés. — Impact : une future session suit `CLAUDE.md` à la lettre (workflow imposé), utilise npm, ignore la CI. — Reco : mettre à jour + purger le backlog. — Effort : S
- 🟡 **Chaîne Node/pnpm non verrouillée** — Preuve : `@types/node ^20` vs `.nvmrc`=24 et `engines ">=22 <25"` ; aucun `packageManager` alors que la CI épingle pnpm 10. — Impact : types Node 22-24 inexacts ; rien n'empêche un `npm install` accidentel (déjà arrivé, TODO.md:801). — Reco : `@types/node@^24` + `"packageManager": "pnpm@10.x"`. — Effort : S
- 🟡 **Biome ne couvre ni `scripts/` ni `tests/`** — Preuve : `biome.json` `files.includes` = `["app/**","components/**","lib/**","types/**","*.ts","*.json"]` ; or `scripts/verify-rls.ts` (service role sur base réelle) et les seeds (~2 400 l.) échappent au lint. — Reco : ajouter `scripts/**` et `tests/**`. — Effort : S
- 🔵 **Pre-commit auto-fixe sans re-stager** — Preuve : `.husky/pre-commit` = `pnpm run lint:fix && pnpm run type-check` (`--write` modifie l'arbre après staging). — Reco : `biome check` sans write, ou lint-staged. — Effort : S
- 🔵 **Points forts** — `.env.example` aligné, `tsconfig strict:true` sans flag de neutralisation, seeds relançables, `docs/FONCTIONNALITES.md`.

**Top 3 actions** : (1) séparer la base de dev de la prod — M ; (2) réaligner `CLAUDE.md` + backlog — S ; (3) `packageManager` + `@types/node@24` + périmètre Biome — S.

---

## 5. Plan d'action priorisé

### Priorité absolue — le 🔴 (à traiter avant tout le reste)
0. **Cesser la cascade destructrice sur `profiles` → dépenses du groupe** (D16, effort M) — traiter `expenses`/`expense_beneficiaries` (et photos/sondages/checklist) dans `lib/account/deletion.ts` comme les événements le sont déjà (réassignation à un compte fantôme), ou passer les FK en `RESTRICT`/`SET NULL`. Une suppression de compte ne doit pas fausser silencieusement les soldes de tout l'équipage.

### Quick wins (effort S, impact fort) — à faire en premier
1. **Bump `next` ≥ 16.2.5** (A7/B11) — corrige 8 CVE *high* dont le bypass middleware, en une commande.
2. **Vérifier l'email de l'invité à l'acceptation** (B10) — `user.email === invited_email` dans `invitations/[token]/actions.ts`.
3. **Logger les branches d'échec des actions documents/photos + viewer** (D17) — rend les incidents reconstituables.
4. **Réaligner `CLAUDE.md`** (A1/A8/E18) — stack pnpm/Biome/CI/tests réelle ; débloque toutes les futures sessions.
5. **`@types/node@24` + `packageManager` + périmètre Biome sur `scripts/`+`tests/`** (E18).
6. **`import "server-only"` sur les 5 modules service-role** (A1) — verrou architectural.
7. **Passer les ~20 messages FR en dur sur `t()`** (A4) — solde PHIL-Q37.

### Chantiers (M/L)
8. **Purge Storage à la suppression de voyage + balayage d'orphelins au cron** (D16) — RGPD + quota.
9. **Verrouiller en base les colonnes OWNER-only de `trips`** (B10) — trigger ou RPC, supprime l'escalade EDITOR.
11. **Restreindre `images.remotePatterns` à une allowlist** (B11) — ferme le SSRF.
12. **Brancher le rate limiting + provisionner Upstash** (B11).
13. **Tests des zones critiques** (A5) — `watermark`, `vault-session`, intégration `deleteAccount`.
14. **`React.cache()` sur getUser/profil/trip + Suspense météo/OSRM** (C13/C14) — latence perçue.
15. **Séparer la base Supabase dev de la prod** (E18) — protège les documents d'identité réels.
16. **Chiffrer `document_number` au repos, ou réaligner la promesse `CLAUDE.md`** (B12) — effort L.

### Optionnel / cosmétique
- Type `ActionState` unifié, standard formulaire `useActionState`, `<TimezoneSelect>` partagé, palette JS centralisée, scission des God components, `not-found.tsx` (A2/A9/D15).

---

## 6. Limites de l'audit

**Non couvert / non vérifiable en lecture seule** (avec la méthode de vérification) :
- **Comportement RLS à l'exécution** : `scripts/verify-rls.ts` non lancé (pas d'accès base). → L'exécuter contre un projet de test (`pnpm verify:rls`).
- **Enforcement RLS de Realtime (WALRUS)** sur `polls/poll_votes/idea_votes/expenses` : supposé actif. → Tester avec un client abonné non-participant.
- **Config du dashboard Supabase** (allowlist redirect OAuth, expiration JWT, protection mot de passe fuité, encryption-at-rest SSE Storage/Postgres, PITR/backups) : hors repo. → Vérifier dans le dashboard fournisseur.
- **Drift schéma réel ↔ migrations** : invérifiable sans accès base. → `supabase db diff --linked`.
- **Efficacité runtime des en-têtes/CSP** : `tests/e2e/security-headers.spec.ts` existe mais non exécuté. → `pnpm test:e2e`.
- **Plans d'exécution SQL réels** (`EXPLAIN ANALYZE`) et latence Vercel↔Supabase : → dashboard Supabase (Query Performance) + logs Vercel.
- **Poids First-Load JS par route** : Next 16/Turbopack n'émet pas de tableau de tailles ; analyse par inspection des chunks. → Audit réseau navigateur / `@next/bundle-analyzer`.
- **Web Vitals réels, re-renders profilés, comportement offline sur appareil** : non exécutables ici.
- **Variables d'environnement effectivement posées en prod Vercel** (Upstash, CRON_SECRET, INBOUND_EMAIL_SECRET, VAPID) : non visibles. → `vercel env ls`.
- **Contenu réel des logs runtime de production** : non accessible. → Console Vercel.

**Partiellement couvert** : fichiers i18n (~3 500 l.) et seeds (~2 400 l.) non lus en détail ; `app/sw.ts` (stratégies Serwist) et `app/api/inbound-email/route.ts` lus partiellement ; primitives `components/ui/*` survolées. La duplication inter-fichiers a été détectée par lecture ciblée et grep, pas par un outil de clone detection.

**Rappel de méthode** : les vérifications outillées (build, lint, type-check, tests, `pnpm audit`, `depcheck`) ont été exécutées en Phase 0 ; chaque finding 🟠 a été relu une seconde fois en Phase 2 en cherchant activement à le réfuter (contrôle ailleurs : middleware, RLS, contrainte DB, trigger). Les dix 🟠 ont survécu à cette contre-vérification ; aucun n'a été dégradé en « hypothèse à confirmer ».
