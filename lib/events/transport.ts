export const TRANSPORT_MODES = ["plane", "train", "bus", "car", "ferry", "other"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  plane: "Avion",
  train: "Train",
  bus: "Bus",
  car: "Voiture",
  ferry: "Ferry",
  other: "Autre",
};

/** Suggestion de titre : "Avion CDG → MRU", "Train Paris → Lyon"… */
export function suggestTransportTitle(mode: TransportMode, from: string, to: string): string {
  const parts = [TRANSPORT_MODE_LABELS[mode]];
  if (from && to) {
    parts.push(`${from} → ${to}`);
  } else if (from || to) {
    parts.push(from || to);
  }
  return parts.join(" ");
}
