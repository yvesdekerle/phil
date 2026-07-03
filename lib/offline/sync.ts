import { createClient } from "@/lib/supabase/client";
import { type OfflineDocumentMeta, offlineDb } from "./db";

/**
 * Synchronise un voyage dans IndexedDB pour la lecture offline (PHIL-I03).
 * Lectures via le client de session : la RLS garantit qu'on ne cache
 * que ce que l'utilisateur a le droit de voir.
 */
export async function syncTrip(tripId: string): Promise<SyncResult | null> {
  const supabase = createClient();

  const [
    { data: trip },
    { data: events },
    { data: tripDocs },
    { data: sharedRows },
    { data: ideas },
  ] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase.from("trip_events").select("*").eq("trip_id", tripId),
    supabase
      .from("documents")
      .select("id, trip_id, file_name, category, mime_type, uploaded_at, profiles(display_name)")
      .eq("trip_id", tripId)
      .eq("scope", "TRIP")
      .is("deleted_at", null),
    supabase
      .from("document_shares")
      .select(
        "documents(id, file_name, category, mime_type, uploaded_at, deleted_at, profiles(display_name))",
      )
      .eq("trip_id", tripId),
    supabase.from("trip_ideas").select("*").eq("trip_id", tripId),
  ]);

  if (!trip) {
    return null;
  }

  const documents: OfflineDocumentMeta[] = [
    ...(tripDocs ?? []).map((d) => ({
      id: d.id,
      trip_id: tripId,
      file_name: d.file_name,
      category: d.category as string,
      mime_type: d.mime_type,
      uploaded_at: d.uploaded_at,
      owner_name: d.profiles?.display_name ?? "Voyageur",
    })),
    ...(sharedRows ?? [])
      .map((r) => r.documents)
      .filter((d): d is NonNullable<typeof d> => d !== null && d.deleted_at === null)
      .map((d) => ({
        id: d.id,
        trip_id: tripId,
        file_name: d.file_name,
        category: d.category as string,
        mime_type: d.mime_type,
        uploaded_at: d.uploaded_at,
        owner_name: d.profiles?.display_name ?? "Voyageur",
      })),
  ];

  await offlineDb.transaction(
    "rw",
    [
      offlineDb.trips,
      offlineDb.events,
      offlineDb.documents_meta,
      offlineDb.ideas,
      offlineDb.sync_meta,
    ],
    async () => {
      await offlineDb.trips.put(trip);
      await offlineDb.events.where("trip_id").equals(tripId).delete();
      await offlineDb.events.bulkPut(events ?? []);
      await offlineDb.documents_meta.where("trip_id").equals(tripId).delete();
      await offlineDb.documents_meta.bulkPut(documents);
      await offlineDb.ideas.where("trip_id").equals(tripId).delete();
      await offlineDb.ideas.bulkPut(ideas ?? []);
      await offlineDb.sync_meta.put({
        key: `trip:${tripId}`,
        syncedAt: new Date().toISOString(),
        eventCount: (events ?? []).length,
        documentCount: documents.length,
        ideaCount: (ideas ?? []).length,
      });
    },
  );

  return {
    syncedAt: new Date().toISOString(),
    eventCount: (events ?? []).length,
    documentCount: documents.length,
    ideaCount: (ideas ?? []).length,
  };
}

export type SyncResult = {
  syncedAt: string;
  eventCount: number;
  documentCount: number;
  ideaCount: number;
};
