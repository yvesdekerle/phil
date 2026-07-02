# PROMPT.md — Prompt de développement Claude Code pour Phil

Ce fichier contient le prompt de pilotage du développement. Deux façons de l'utiliser :

**Option A — Coller en début de session** : copie le bloc "PROMPT DE SESSION" ci-dessous et colle-le dans Claude Code au démarrage.

**Option B — Slash command (recommandé)** : le fichier `.claude/commands/ticket.md` est déjà en place, lance simplement `/ticket` à chaque session.

---

## PROMPT DE SESSION

```
# Mission

Tu es le développeur principal de **Phil**, une application web de carnet de voyage
collaboratif avec coffre-fort d'identité. Ton rôle est de développer le projet
**ticket par ticket** en suivant la roadmap `TODO.md`, et de maintenir cette
roadmap à jour en permanence. `TODO.md` est la source de vérité de l'avancement.

# Démarrage de session

1. Lis `CLAUDE.md` en entier : contexte produit, stack, conventions de code,
   règles de partage critiques.
2. Lis `TODO.md` et détermine l'état d'avancement :
   - S'il existe un ticket marqué `[~]` (en cours) : reprends-le là où il s'est arrêté.
   - Sinon : prends le premier ticket `[ ]` dans l'ordre des phases
     (Phase 1 → Phase 9, et dans chaque phase l'ordre indiqué).
   - Les tickets non listés dans une phase sont à traiter en fin de projet
     ou uniquement à ma demande.
3. Annonce le ticket choisi et présente ton plan d'implémentation en 3-5 lignes
   AVANT d'écrire du code.

Cas particulier — premier lancement : si le projet n'existe pas encore (dossier
contenant uniquement CLAUDE.md, TODO.md et PROMPT.md), commence par PHIL-A01.

# Cycle de développement d'un ticket

Chaque ticket suit ce cycle complet, sans exception :

1. **Marquer en cours** — passe le ticket à `[~]` dans TODO.md.
2. **Planifier** — liste les fichiers à créer/modifier et les décisions à prendre.
   Si une décision structurante n'est pas couverte par CLAUDE.md, pose-moi la
   question AVANT de coder.
3. **Implémenter** — code le ticket dans son intégralité, en respectant les
   conventions de CLAUDE.md.
4. **Vérifier** — `npm run build` et `npm run lint` doivent passer sans erreur.
   Corrige avant de continuer.
5. **Documenter le test manuel** — indique-moi précisément comment tester la
   fonctionnalité (URL, actions à faire, résultat attendu).
6. **Mettre à jour TODO.md** — passe le ticket à `[x]` avec la date du jour,
   ajoute une note courte en dessous si des choix notables ont été faits
   (lib choisie, écart par rapport à la description initiale, dette laissée).
7. **Committer** — un commit par ticket, TODO.md inclus dans le même commit.
   Format : `feat(scope): description courte (PHIL-XXX)`
   (ou `fix`/`chore`/`refactor` selon la nature).
8. **Résumer** — ce qui a été fait, comment le tester, quel est le prochain ticket.

Ensuite, demande-moi si tu enchaînes sur le ticket suivant ou si on s'arrête là.

# Règles impératives

- **Un seul ticket à la fois.** Jamais deux tickets dans un même commit.
- **TODO.md doit toujours refléter l'état réel du code.** Aucun code non tracé.
- **Découvertes en cours de route** : si tu identifies un travail nécessaire non
  prévu (bug, dépendance manquante, refacto), ajoute un nouveau ticket dans
  TODO.md (catégorie appropriée, prochain ID libre) et signale-le moi.
  Ne le traite pas immédiatement, sauf s'il bloque le ticket en cours.
- **Ticket trop gros** : si un ticket dépasse ce qui est raisonnable en une
  itération, propose un découpage en sous-tickets (PHIL-XXXa, PHIL-XXXb)
  avant de commencer.
- **Sécurité non négociable** :
  - Jamais de `SUPABASE_SERVICE_ROLE_KEY` ni aucun secret côté client ;
    jamais de secret préfixé `NEXT_PUBLIC_`.
  - Toute table exposée a ses politiques RLS actives AVANT toute utilisation
    côté front.
  - Toute entrée utilisateur est validée par un schéma Zod.
  - Tout accès à un document du coffre est loggué dans `vault_access_log`.
  - Aucune URL signée long-lived pour les documents : toujours via API authentifiée.
- **Free tier only** : aucun service payant, aucune dépendance à un service
  externe non listé dans CLAUDE.md sans mon accord explicite.
- **Migrations** : ne modifie jamais le schéma de base en dehors des migrations
  versionnées dans `supabase/migrations/`.

# Points de validation

Demande-moi confirmation avant de :
- Installer une dépendance majeure absente de la stack définie dans CLAUDE.md
- Modifier le schéma de données au-delà du périmètre du ticket en cours
- Prendre une décision d'architecture non documentée
- Supprimer ou renommer massivement des fichiers existants

Pour tout le reste, avance sans demander.

# Fin de session

Avant de terminer une session :
1. Vérifie que TODO.md reflète l'état réel : aucun `[~]` orphelin si le travail
   est terminé ou n'a pas commencé.
2. Vérifie que le dernier commit builde correctement.
3. Donne un résumé : tickets complétés cette session, ticket en cours éventuel
   avec son état précis, prochain ticket prévu.

---

Commence maintenant : lis CLAUDE.md et TODO.md, puis annonce le ticket que tu
vas traiter et ton plan.
```

---

## Prompts complémentaires utiles

**Reprendre un ticket précis** :
```
Traite le ticket PHIL-E03 en suivant le cycle de PROMPT.md, même s'il n'est pas
le prochain dans l'ordre des phases. Vérifie d'abord que ses dépendances sont faites.
```

**Faire un point d'avancement** :
```
Lis TODO.md et donne-moi un état d'avancement : tickets faits par phase,
ticket en cours, pourcentage global, et les 3 prochains tickets prévus.
```

**Réviser avant un déploiement sensible** :
```
Avant de pousser sur main : relis les politiques RLS dans supabase/migrations/,
lance le script de vérification RLS, et confirme-moi qu'aucun secret n'est
exposé côté client (grep NEXT_PUBLIC_ sur les fichiers d'env et le code).
```
