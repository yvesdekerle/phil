import { offlineDb } from "./db";

/**
 * Purge toute la donnée locale (PHIL-Q41) — base Dexie (voyages, événements,
 * idées, métadonnées et **blobs de documents**) + caches du service worker.
 * Appelé à la déconnexion et sur l'événement SIGNED_OUT : la base est par
 * navigateur (pas par utilisateur), donc sans purge l'utilisateur suivant d'un
 * poste partagé pourrait rouvrir les documents du précédent.
 */
export async function clearOfflineData(): Promise<void> {
  try {
    await offlineDb.delete();
  } catch {
    // base absente ou déjà fermée : rien à faire
  }
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("phil-")).map((k) => caches.delete(k)));
    } catch {
      // Cache Storage indisponible : on ignore
    }
  }
}
