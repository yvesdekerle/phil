import Dexie, { type EntityTable } from "dexie";
import type { TripEvent } from "@/lib/events/types";
import type { TripIdea } from "@/lib/ideas/types";
import type { Trip } from "@/lib/trips/status";

export type OfflineDocumentMeta = {
  id: string;
  trip_id: string | null;
  file_name: string;
  category: string;
  mime_type: string;
  uploaded_at: string;
  owner_name: string;
};

export type SyncMeta = {
  key: string; // `trip:{id}`
  syncedAt: string;
  eventCount: number;
  documentCount: number;
  ideaCount: number;
};

/** Base locale IndexedDB pour la lecture offline (PHIL-I03/I05). */
export const offlineDb = new Dexie("phil-offline") as Dexie & {
  trips: EntityTable<Trip, "id">;
  events: EntityTable<TripEvent, "id">;
  documents_meta: EntityTable<OfflineDocumentMeta, "id">;
  ideas: EntityTable<TripIdea, "id">;
  sync_meta: EntityTable<SyncMeta, "key">;
};

offlineDb.version(1).stores({
  trips: "id",
  events: "id, trip_id",
  documents_meta: "id, trip_id",
  ideas: "id, trip_id",
  sync_meta: "key",
});
