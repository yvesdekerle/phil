# i18n — traduire un écran (PHIL-Q37)

L'app se traduit **écran par écran**, sans jamais rien casser : toute clé
anglaise absente **retombe sur le français** (voir `translator` dans
`messages/index.ts`). On peut donc traduire un écran aujourd'hui et son anglais
demain.

## Recette pour un écran

1. **Ajouter les clés en français** dans `messages/fr.ts`, sous un namespace
   dédié à l'écran (ex. `budget: { … }`, `vault: { … }`). Le français est la
   **source complète**.
2. **Ajouter la traduction anglaise** dans `messages/en.ts` (mêmes clés).
   Optionnel/partiel : ce qui manque s'affiche en français.
3. **Remplacer les chaînes en dur** par `t("namespace.cle")` :
   - **Composant serveur** (`async function`) : `const t = await getT()` depuis
     `@/lib/i18n/server`.
   - **Composant client** (`"use client"`) : `const t = useT()` depuis
     `@/components/i18n/provider`.
   - **Action serveur** (message renvoyé à l'UI) : `const t = await getT()`.
4. `pnpm build && pnpm lint` doivent passer.

## Règles

- **Jamais** de chaîne UI en dur : toujours via `t()`.
- Les **données utilisateur** (nom de voyage, destination, titres d'événements)
  ne se traduisent pas — elles restent telles quelles.
- Garder la **microcopy Verne** dans les deux langues (clins d'œil au roman).
- Les **dates** : à localiser via `date-fns` locale dans une passe dédiée
  (`lib/trips/format.ts` et les helpers `datetime`).

## Suivi

La liste des écrans traduits / restants est tenue dans `TODO.md` sous
`PHIL-Q37`.
