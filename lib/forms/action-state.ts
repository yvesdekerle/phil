/**
 * État partagé des formulaires / server actions (PHIL-R20). Un seul type canonique
 * pour le duo `status`/`message` répété dans toute l'app, en deux variantes :
 *  - `ActionState` : formulaires qui ne signalent que l'échec (idle/error) ;
 *  - `ActionStateWithSuccess` : ceux qui affichent aussi un succès (ex. réglages).
 * Les types nommés par domaine (`MiamState`, `DocumentActionState`, …) en dérivent
 * — on garde le nom sémantique, la forme est définie une fois ici.
 */
export type ActionState = { status: "idle" | "error"; message?: string };

export type ActionStateWithSuccess = { status: "idle" | "success" | "error"; message?: string };
