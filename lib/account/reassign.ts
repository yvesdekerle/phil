/**
 * Décisions pures de la réattribution des données à la suppression de compte
 * (PHIL-R05 / R13). Extraites de `deletion.ts` pour être testables sans base :
 * ce sont les points où une erreur fausse silencieusement les soldes du groupe
 * ou casse une contrainte, donc ceux qui méritent des tests dédiés.
 */

/** Participant d'un voyage, réduit aux champs qui décident du successeur. */
export type Participant = {
  user_id: string;
  role: string;
  joined_at: string;
};

/**
 * Successeur OWNER d'un voyage quand son capitaine supprime son compte.
 * `others` = les autres participants, triés par ancienneté (`joined_at` asc).
 *
 * - `others` vide → personne à promouvoir (le voyage est supprimé ailleurs) ;
 * - un autre OWNER existe déjà → personne à promouvoir (le voyage a un chef) ;
 * - sinon le plus ancien EDITOR, à défaut le plus ancien participant.
 *
 * Retourne l'`user_id` à promouvoir, ou `null` si aucune promotion.
 */
export function pickTripSuccessor(others: Participant[]): string | null {
  if (others.length === 0) {
    return null;
  }
  if (others.some((p) => p.role === "OWNER")) {
    return null;
  }
  const successor = others.find((p) => p.role === "EDITOR") ?? others[0];
  return successor.user_id;
}

/**
 * Bénéficiaires de dépense en collision lors de la réattribution au fantôme.
 * La PK de `expense_beneficiaries` est `(expense_id, user_id)` : si le fantôme
 * bénéficie déjà d'une dépense dont le partant bénéficie aussi, réattribuer le
 * partant au fantôme violerait la PK. On supprime d'abord la ligne du partant.
 *
 * Retourne les `expense_id` présents des deux côtés (à purger côté partant).
 */
export function beneficiaryCollisions<T>(mine: T[], ghosts: T[]): T[] {
  const ghostSet = new Set(ghosts);
  return mine.filter((id) => ghostSet.has(id));
}
