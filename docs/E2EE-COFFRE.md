# Coffre chiffré de bout en bout (E2EE) — plan d'implémentation

> Chantier le plus sensible du projet. Objectif : le serveur ne voit **jamais** le
> contenu des documents d'identité ni les clés. Déverrouillage biométrique
> (WebAuthn PRF), sans mot de passe. À construire par **phases vérifiables**.

## But & modèle de menace (honnête)

**Ce qu'on protège :**
- Fuite Supabase / clé service-role / dump base → **inutile** (chiffré, la clé n'y est pas). ✅
- Quelqu'un se connecte comme toi → voit du **chiffré**, sans ta clé il ne déchiffre rien. ✅
- Cache offline → **chiffré au repos**. ✅

**Ce qu'on ne protège PAS (à assumer) :**
- Appareil **déverrouillé** entre des mains techniques, sur un appareil **sans PRF** : la clé en cache peut être extraite. Barrière forte, pas absolue.
- Un **destinataire légitime** qui capture ce qu'il a le droit de voir → couvert par le **filigrane** (dissuasif/traçable), pas par le chiffrement.
- **Bug crypto** = perte de données définitive **ou** fausse sécurité. Ce code exige une prudence maximale, des tests, idéalement une relecture.

## Décisions arrêtées

| Sujet | Choix |
|---|---|
| Racine | **Biométrie seule** (WebAuthn PRF), **sans mot de passe** au quotidien |
| Multi-appareils | Ajout par **QR** depuis un appareil configuré |
| Récupération | **Code de secours OPTIONNEL** (proposé à la création, « Plus tard ») |
| Activation | À la **création du compte** (1 prompt Face ID), repli si appareil sans biométrie |
| Périmètre chiffrement | **Coffre** (perso, E2EE) ; docs de voyage partagés = verrou biométrique + RLS |
| Verrou biométrique | Sur **tous** les documents (coffre + voyage) |
| Filigrane | **Côté client** après déchiffrement : « Phil · vu par {Prénom Nom} · {id} · date » |
| Partage | Action in-app (ré-emballage de clé), **durée limitée 1h par défaut** + filigrane + audit |

## Architecture cryptographique

- **Par utilisateur** : une paire de clés asymétriques (ECDH P-256 ou X25519) + une **clé maîtresse** symétrique (AES-256).
  - Clé **publique** → serveur (pour que d'autres partagent vers toi).
  - Clé **privée** + maîtresse → **scellées par la biométrie** (secret dérivé via WebAuthn PRF), stockées chiffrées (jamais en clair côté serveur ni IndexedDB).
- **Par document** : clé unique **DEK** (AES-GCM). Le fichier est chiffré côté client avec la DEK. La DEK est **emballée** par la clé maîtresse du propriétaire.
- **Partage** : la DEK est **ré-emballée** avec la **clé publique du destinataire** (ECDH → clé d'emballage), stockée dans `document_shares`, avec `expires_at`.
- **Multi-appareils** : la clé maîtresse est stockée **emballée par le secret PRF de chaque appareil** (une copie par appareil). Ajout d'appareil = un appareil source emballe la maîtresse pour le nouveau (via QR).
- **Code de secours** (optionnel) : la clé maîtresse emballée par une clé dérivée d'un code aléatoire affiché une fois.

## Migrations nécessaires

1. `user_crypto_keys` : `user_id` (PK), `public_key` (jsonb/text), `created_at`. Clé publique lisible par les co-voyageurs (RLS = `shares_trip_with`, comme les profils).
2. `user_master_key_wraps` : `user_id`, `device_label`, `wrap_method` (`PRF`|`RECOVERY`), `wrapped_key`, `created_at`, PK `(user_id, device_label)`. Lecture/écriture **par soi uniquement**.
3. `documents` (ALTER) : `encrypted boolean not null default false`, `wrapped_dek text`, `iv text`, `crypto_algo text`.
4. `document_shares` (ALTER) : `wrapped_dek_for_recipient text` (la DEK emballée pour le destinataire). `expires_at` existe déjà (défaut 1h à câbler côté action).

## Phases (chacune buildable + testable indépendamment)

### Phase 0 — Fondations clés
- Lib `lib/crypto/` : génération de clés, dérivation PRF (WebAuthn `extensions.prf`), wrap/unwrap AES-GCM, ECDH. Tests unitaires (vecteurs connus).
- Migration 1 + 2. Activation du coffre (client) : génère les clés, crée la passkey PRF, uploade la clé publique + la maîtresse emballée.
- Déclencheur : à l'onboarding (après login Google), écran « On sécurise ton coffre — Face ID », avec repli « appareil sans biométrie → plus tard ».
- **Vérif** : un user a ses clés ; peut déverrouiller la maîtresse par biométrie.

### Phase 1 — Chiffrement des documents du coffre
- Upload (`vault/new`) : chiffrer le fichier **côté client** (DEK + AES-GCM) avant l'envoi Storage ; stocker `wrapped_dek`/`iv`/`encrypted=true`.
- Viewer coffre : devient **client** — récupère le chiffré + `wrapped_dek`, **déchiffre en mémoire** après biométrie, affiche.
- Migration 3.
- **Vérif** : un doc uploadé est illisible côté serveur/Storage ; s'affiche déchiffré côté client.

### Phase 2 — Filigrane client + verrou biométrique généralisé
- Filigrane **côté client** (pdf-lib navigateur) après déchiffrement : « Phil · vu par {lecteur} · {id} · date ».
- Verrou biométrique (déverrouillage PRF) exigé à l'ouverture de **tout** document (coffre + voyage).
- **Vérif** : Face ID demandé à chaque ouverture ; filigrane au nom du lecteur présent.

### Phase 3 — Partage E2EE + durée limitée
- Action de partage : ré-emballe la DEK pour la clé publique du destinataire ; `expires_at` défaut **1h**.
- Viewer destinataire : déballe avec sa clé privée, déchiffre.
- Migration 4 ; état « le destinataire doit activer son coffre » si pas de clé publique.
- **Vérif** : partager à une personne, accès qui expire, audit « X a vu à HH:MM ».

### Phase 4 — Offline chiffré + multi-appareils
- Cache offline du **chiffré** ; déchiffrement après biométrie ; le coffre devient consultable offline.
- Ajout d'appareil par **QR** (transfert de la maîtresse emballée pour le nouvel appareil).
- Génération du **code de secours** (optionnel).
- **Vérif** : lecture offline après Face ID ; 2e appareil ajouté par QR lit les mêmes docs.

### Phase 5 — Reprise de l'existant + repli + audit différé
- Migration des docs coffre existants (non chiffrés) : re-upload chiffré côté client (au prochain accès, ou action « sécuriser mes documents »).
- Repli appareils sans PRF : verrou biométrique + chiffrement OS (garantie moindre, documentée).
- Audit des accès offline **différé** à la reconnexion.

## Risques & garde-fous
- **Perte de données** : bien tester wrap/unwrap avant de chiffrer quoi que ce soit de réel ; garder un chemin de secours pendant la reprise (Phase 5).
- **Support PRF hétérogène** : détecter le support à l'activation ; repli explicite si absent.
- **Ne jamais** logguer une clé, une DEK ou un secret PRF.
- Tests crypto unitaires obligatoires (Phase 0) avant toute donnée réelle.
