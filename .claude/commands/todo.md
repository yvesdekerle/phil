---
name: todo
description: Afficher l'état de la roadmap ou mettre à jour un ticket
argument-hint: [done PHIL-XXX | phase N | next]
allowed-tools: Read, Edit, Grep
---

Lis le fichier `tmp/TODO.md` et agis selon l'argument fourni :

## Sans argument (ou `status`)

Affiche un résumé concis de la roadmap :

1. **Phase en cours** : identifie la phase qui contient des tickets `[~]` (en cours) ou la première phase avec des `[ ]` (à faire).
2. **Progression** : pour chaque phase, compte les tickets `[x]`, `[~]` et `[ ]`. Affiche uniquement les phases qui ont au moins un ticket non terminé, sous forme de tableau compact.
3. **Prochain ticket** : identifie le prochain ticket `[ ]` dans la phase en cours (selon l'ordre de la phase).
4. **Résumé global** : total tickets faits / total tickets.

Format de sortie attendu (exemple) :
```
📍 Phase 2 — Données et voyages (3/10)

| Phase | Progression |
|-------|------------|
| 2 — Données et voyages | ███░░░░░░░ 3/10 |
| 3 — Coffre | ░░░░░░░ 0/7 |

▶ Prochain : PHIL-B09 — RLS policies sur trips et participants

Global : 12/87 tickets terminés
```

## `done PHIL-XXX`

1. Trouve le ticket PHIL-XXX dans `tmp/TODO.md`
2. Remplace `[ ]` ou `[~]` par `[x]` sur la ligne du titre du ticket
3. Confirme le changement
4. Affiche le résumé comme ci-dessus

## `wip PHIL-XXX`

1. Trouve le ticket PHIL-XXX dans `tmp/TODO.md`
2. Remplace `[ ]` par `[~]` sur la ligne du titre du ticket
3. Confirme le changement
4. Affiche le résumé comme ci-dessus

## `phase N`

Affiche le détail de la phase N : tous les tickets avec leur statut et une description courte (première ligne du ticket).

## `next`

Affiche uniquement le prochain ticket à traiter (premier `[ ]` de la phase en cours) avec sa description complète.

## Règles

- La source de vérité est toujours `tmp/TODO.md` — lis-le à chaque appel.
- Ne modifie jamais l'ordre des tickets ou la structure du fichier.
- Si `$ARGUMENTS` contient un ID de ticket (PHIL-XXX), traite-le comme `done PHIL-XXX`.
- Si le ticket n'existe pas, signale l'erreur.
