# Plan de réponse à incident (PHIL-J08)

Que faire si ça tourne mal. Phil manipule des **pièces d'identité** (passeports,
CNI) et des données perso d'un petit groupe — donc même en usage privé, une fuite
n'est pas anodine. Ce document est une **checklist à froid** pour agir vite et bien
le jour où il fait chaud.

> **Bonne nouvelle structurelle** : le coffre est **chiffré de bout en bout**
> (cf. `docs/E2EE-COFFRE.md`). Le serveur ne voit jamais le clair des pièces
> d'identité. Une fuite de la base ou du Storage expose du **chiffré
> inexploitable** pour les documents du coffre — ça change radicalement l'impact
> (voir §3).

## 0. Contacts & accès (à garder à jour)

| Rôle | Qui / Où |
|---|---|
| Responsable (RT au sens RGPD) | Yves Dekerle — yves.dekerle@gmail.com |
| Hébergement app | Vercel (dashboard du projet) |
| Base / Auth / Storage | Supabase (projet `phil`, `xinbuahgscaydpkcamsl`) |
| Emails | Resend |
| Autorité de contrôle | **CNIL** — https://www.cnil.fr |

## 1. Types d'incidents

- **Fuite de données** : dump de la base, bucket Storage mal configuré, export
  exposé.
- **Compromission d'un secret** : `SUPABASE_SERVICE_ROLE_KEY` fuité (le plus
  grave — contourne la RLS), `CRON_SECRET`, clés Resend / VAPID / Google OAuth /
  Gemini / Upstash.
- **Accès non autorisé à un compte** (session volée, OAuth Google compromis).
- **Faille applicative** : politique RLS trop permissive, endpoint qui fuite,
  dépendance vulnérable (`npm audit` / Dependabot).
- **Perte de données** : suppression accidentelle, migration destructrice → voir
  `docs/BACKUP.md`.

## 2. Détection

- **Logs Vercel** (Runtime Logs) + logger structuré `lib/observability/logger.ts`.
- **Journal d'audit du coffre** `vault_access_log` : qui a consulté/partagé quoi
  et quand (forensics côté coffre).
- **Supabase** : logs Auth (connexions), logs Postgres/API.
- **Dependabot** (GitHub) : alertes de dépendances vulnérables.
- Signalement d'un utilisateur du cercle.

## 3. Réponse immédiate — contenir (première heure)

L'objectif est d'**arrêter l'hémorragie** avant d'analyser finement.

1. **Identifier la nature** : quel secret / quelle donnée / quel accès ?
2. **Faire tourner les secrets concernés** (le réflexe n°1 en cas de doute) —
   régénérer côté fournisseur **puis** mettre à jour dans **Vercel → Settings →
   Environment Variables**, et **redéployer** :
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → *rotate* (⚠️
     invalide toutes les intégrations serveur : à refaire partout) ;
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` si nécessaire ;
   - `CRON_SECRET`, `RESEND_API_KEY`, clés **VAPID** (push), `GOOGLE_OAUTH_CLIENT_SECRET`,
     `GEMINI_API_KEY`, tokens **Upstash**.
3. **Couper l'accès si besoin** :
   - Supabase → Auth : **révoquer les sessions** (déconnecte tout le monde) ;
     suspendre un compte compromis.
   - En dernier recours, **mettre l'app en maintenance** (pauser le projet
     Supabase ou retirer les variables d'env → l'app tombe proprement).
4. **Si l'incident vient d'un déploiement** : **rollback** vers le déploiement
   précédent (Vercel → Deployments → *Promote to Production* l'ancien).
5. **Figer les preuves** : noter l'heure de découverte, exporter les logs
   pertinents (Vercel, Supabase, `vault_access_log`) **avant** qu'ils ne tournent.

## 4. Évaluer l'impact

- **Quelles données ?** Distinguer :
  - **Coffre (documents d'identité)** → **chiffré E2EE** : une fuite du chiffré
    seul n'expose **pas** le clair (sauf compromission simultanée des clés d'un
    appareil). Risque fortement réduit.
  - **Données de voyage** (noms, e-mails, destinations, événements, dépenses,
    notes) → **en clair** en base : une fuite les expose. C'est une **violation
    de données personnelles** au sens RGPD.
- **Combien de personnes ?** (le cercle est petit, mais compter précisément).
- **Le `service_role` a-t-il fuité ?** Si oui, considérer que **toute la base
  était accessible** (il contourne la RLS) → traiter au pire cas.
- Décider : **risque faible** / **risque** / **risque élevé** pour les personnes.

## 5. Obligations RGPD (violation de données personnelles)

Phil traite des données personnelles → le RGPD s'applique même en usage privé
élargi.

- **Notifier la CNIL sous 72 h** (RGPD **art. 33**) après avoir *pris connaissance*
  de la violation, **sauf** si elle est *peu susceptible d'engendrer un risque*
  pour les personnes. Téléservice :
  **https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles**.
  La notification décrit : nature de la violation, catégories et nombre approximatif
  de personnes/enregistrements, conséquences probables, mesures prises/prévues.
  En cas de doute, **notifier** (quitte à compléter ensuite).
- **Informer les personnes concernées** *dans les meilleurs délais* (RGPD **art.
  34**) **si le risque est élevé** pour leurs droits et libertés (typiquement :
  fuite en clair de pièces d'identité, ce que l'E2EE vise justement à éviter).
- **Tenir un registre** des violations (même celles non notifiées) — art. 33.5.
  Utiliser le §8 ci-dessous.

## 6. Notification aux utilisateurs (cercle Phil)

Si une communication est requise (ou simplement honnête vu la taille du groupe) :

- **Canal** : e-mail (Resend) et/ou le canal habituel du groupe (WhatsApp).
- **Contenu** : ce qui s'est passé, quelles données, ce qu'on a fait, ce qu'ils
  doivent faire (ex. rester vigilants ; **le coffre chiffré n'est pas exposé**
  si c'est le cas), et un contact.
- **Ton** : factuel, sans minimiser. Pas de « clin d'œil Fogg » ici.

## 7. Remédiation & clôture

- **Corriger la cause racine** (nouveau ticket TODO) : policy RLS, endpoint,
  dépendance (`pnpm dlx npm-check` / `npm audit` / bump Dependabot).
- Si nécessaire, **restaurer** depuis une sauvegarde (`docs/BACKUP.md`).
- **Vérifier** : `pnpm verify:rls` après tout correctif touchant les politiques.
- **Confirmer** que tous les secrets tournés sont bien à jour partout et que les
  anciens sont invalidés.
- **Post-mortem** court (§8) : chronologie, cause, impact, actions, prévention.

## 8. Gabarit de fiche d'incident (à remplir)

```
Incident : <titre court>
Découvert le : <date/heure> par <qui>
Nature : <fuite / secret compromis / accès / faille / perte>
Données concernées : <coffre chiffré ? données voyage en clair ? lesquelles>
Personnes concernées : <nombre / qui>
service_role compromis : <oui/non>
Gravité : <faible / risque / risque élevé>

Chronologie :
- <heure> découverte
- <heure> containment (secrets tournés, sessions révoquées, rollback…)
- <heure> évaluation
- <heure> notification CNIL (si applicable) — réf. :
- <heure> notification utilisateurs (si applicable)
- <heure> correctif déployé
- <heure> clôture

Cause racine :
Correctif (ticket) :
Prévention (ce qu'on change pour que ça ne se reproduise pas) :
```

---

Voir aussi : `docs/BACKUP.md` (restauration), `docs/E2EE-COFFRE.md` (pourquoi une
fuite du coffre est inexploitable), `CLAUDE.md` (règles de sécurité et secrets).
