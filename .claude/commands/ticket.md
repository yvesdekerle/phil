---
description: Développe le prochain ticket de TODO.md en suivant le workflow Phil
---
Lis CLAUDE.md puis TODO.md. Reprends le ticket [~] en cours s'il existe,
sinon prends le premier ticket [ ] dans l'ordre des phases (les tickets hors
phases attendent la fin de projet ou ma demande explicite).

Déroule le cycle complet défini dans PROMPT.md :
plan annoncé → implémentation → build + lint OK → test manuel documenté →
TODO.md mis à jour ([x] + date + note) → un commit unique incluant TODO.md
au format "feat(scope): description (PHIL-XXX)" → résumé.

Respecte les règles impératives de PROMPT.md (sécurité, free tier, un ticket
par commit, découvertes = nouveaux tickets). Demande-moi ensuite si on enchaîne.
