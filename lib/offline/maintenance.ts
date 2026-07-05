import { offlineDb } from "./db";

const DAY_MS = 24 * 3600 * 1000;

/**
 * Entretien du cache offline (PHIL-Q55) — appelé au chargement de l'app quand
 * on est en ligne. Deux règles :
 *  1. Les fichiers gardés offline expirent au bout de `maxAgeDays` (30 j).
 *  2. Un voyage terminé depuis plus de `tripGraceDays` (7 j) est entièrement
 *     purgé du cache (événements, documents, idées, fichiers).
 */
export async function runOfflineMaintenance(
  now: number,
  { maxAgeDays = 30, tripGraceDays = 7 } = {},
): Promise<void> {
  // 1) Fichiers offline périmés
  const blobCutoff = new Date(now - maxAgeDays * DAY_MS).toISOString();
  const staleBlobIds = (await offlineDb.document_blobs.toArray())
    .filter((b) => b.savedAt < blobCutoff)
    .map((b) => b.id);
  if (staleBlobIds.length > 0) {
    await offlineDb.document_blobs.bulkDelete(staleBlobIds);
  }

  // 2) Voyages terminés
  const tripCutoff = new Date(now - tripGraceDays * DAY_MS).toISOString().slice(0, 10);
  const finishedTripIds = (await offlineDb.trips.toArray())
    .filter((t) => typeof t.end_date === "string" && t.end_date < tripCutoff)
    .map((t) => t.id);
  for (const tripId of finishedTripIds) {
    await purgeTripOffline(tripId);
  }
}

/** Purge toute la donnée offline d'un voyage (PHIL-Q55). */
export async function purgeTripOffline(tripId: string): Promise<void> {
  const docIds = await offlineDb.documents_meta.where("trip_id").equals(tripId).primaryKeys();
  await offlineDb.transaction(
    "rw",
    [
      offlineDb.trips,
      offlineDb.events,
      offlineDb.documents_meta,
      offlineDb.document_blobs,
      offlineDb.ideas,
      offlineDb.sync_meta,
    ],
    async () => {
      await offlineDb.events.where("trip_id").equals(tripId).delete();
      await offlineDb.ideas.where("trip_id").equals(tripId).delete();
      await offlineDb.documents_meta.where("trip_id").equals(tripId).delete();
      if (docIds.length > 0) {
        await offlineDb.document_blobs.bulkDelete(docIds);
      }
      await offlineDb.sync_meta.delete(`trip:${tripId}`);
      await offlineDb.trips.delete(tripId);
    },
  );
}
