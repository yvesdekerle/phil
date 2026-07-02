---
name: ticket
description: Développe le prochain ticket de TODO.md en suivant le workflow Phil (plan, implémentation, vérifications, mise à jour TODO, commit unique)
disable-model-invocation: true
---

Lis CLAUDE.md puis TODO.md. Reprends le ticket [~] en cours s'il existe,
sinon prends le premier ticket [ ] dans l'ordre des phases (les tickets
hors phases attendent la fin de projet ou ma demande explicite).

Déroule le cycle complet défini dans PROMPT.md :

1. Passe le ticket à [~] dans TODO.md
2. Annonce ton plan d'implémentation (3-5 lignes) AVANT de coder ;
   si une décision structurante n'est pas couverte par CLAUDE.md,
   pose-moi la question d'abord
3. Implémente en respectant les conventions de CLAUDE.md
4. Vérifie : npm run build et npm run lint doivent passer sans erreur
5. Documente le test manuel (URL, actions, résultat attendu)
6. Passe le ticket à [x] avec la date + note éventuelle sous le ticket
7. Un commit unique incluant TODO.md : "feat(scope): description (PHIL-XXX)"
8. Résume ce qui a été fait et demande-moi si on enchaîne

Règles impératives (détail dans PROMPT.md) : un seul ticket à la fois,
jamais de secrets côté client, RLS active avant toute utilisation front,
accès coffre loggués dans vault_access_log, free tier only,
travaux découverts = nouveaux tickets dans TODO.md, jamais de code non tracé.
