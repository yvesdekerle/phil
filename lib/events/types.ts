import type { Database } from "@/types/database";

export type TripEvent = Database["public"]["Tables"]["trip_events"]["Row"];
export type EventType = Database["public"]["Enums"]["event_type"];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TRANSPORT: "Transport",
  LODGING: "Hébergement",
  ACTIVITY: "Activité",
};
