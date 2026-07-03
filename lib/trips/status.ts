import type { Database } from "@/types/database";

export type Trip = Database["public"]["Tables"]["trips"]["Row"];

export type TripStatus = "en_cours" | "a_venir" | "passe" | "archive";

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  en_cours: "En cours",
  a_venir: "À venir",
  passe: "Passé",
  archive: "Archivé",
};

/** Statut dérivé des dates (comparaison sur la date locale, pas l'heure). */
export function tripStatus(trip: Trip, today = new Date()): TripStatus {
  if (trip.archived_at) {
    return "archive";
  }
  const d = today.toISOString().slice(0, 10);
  if (trip.end_date < d) {
    return "passe";
  }
  if (trip.start_date > d) {
    return "a_venir";
  }
  return "en_cours";
}

/** Ordre d'affichage : en cours, à venir (départ proche d'abord), passés (récents d'abord), archivés. */
export function sortTrips(trips: Trip[]): Trip[] {
  const rank: Record<TripStatus, number> = { en_cours: 0, a_venir: 1, passe: 2, archive: 3 };
  return [...trips].sort((a, b) => {
    const sa = tripStatus(a);
    const sb = tripStatus(b);
    if (rank[sa] !== rank[sb]) {
      return rank[sa] - rank[sb];
    }
    if (sa === "passe" || sa === "archive") {
      return b.start_date.localeCompare(a.start_date);
    }
    return a.start_date.localeCompare(b.start_date);
  });
}
