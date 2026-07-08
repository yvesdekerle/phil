import Dexie, { type EntityTable } from "dexie";
import type { MasterWrapDto } from "@/app/(app)/profile/coffre-actions";
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

export type OfflineDocumentBlob = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  blob: Blob;
  savedAt: string;
  // PHIL-T01 Phase 4b — document chiffré : `blob` est le CHIFFRÉ ; ces champs
  // permettent de le déchiffrer offline (DEK emballée par la maîtresse du coffre).
  encrypted?: boolean;
  wrapped_dek?: string;
  dek_iv?: string;
  file_iv?: string;
};

/** Métadonnées d'un document du coffre gardé offline (PHIL-T01 Phase 4b). */
export type OfflineVaultDocMeta = {
  id: string;
  file_name: string;
  category: string;
  mime_type: string;
  uploaded_at: string;
};

/**
 * Enveloppes PRF de la maîtresse mises en cache pour déverrouiller le coffre
 * offline (PHIL-T01 Phase 4b). C'est du CHIFFRÉ au repos (la maîtresse scellée
 * par la biométrie), jamais la clé en clair.
 */
export type OfflineCryptoWraps = { key: string; wraps: MasterWrapDto[] };

/**
 * File d'attente d'audit (PHIL-T01 Phase 5b) : une consultation d'un document du
 * coffre faite offline ne peut pas écrire dans `vault_access_log` → on la met en
 * file et on la rejoue à la reconnexion.
 */
export type OfflineVaultAudit = { id?: number; document_id: string; at: string };

/** Base locale IndexedDB pour la lecture offline (PHIL-I03/I05). */
export const offlineDb = new Dexie("phil-offline") as Dexie & {
  trips: EntityTable<Trip, "id">;
  events: EntityTable<TripEvent, "id">;
  documents_meta: EntityTable<OfflineDocumentMeta, "id">;
  ideas: EntityTable<TripIdea, "id">;
  sync_meta: EntityTable<SyncMeta, "key">;
  document_blobs: EntityTable<OfflineDocumentBlob, "id">;
  vault_docs_meta: EntityTable<OfflineVaultDocMeta, "id">;
  crypto_wraps: EntityTable<OfflineCryptoWraps, "key">;
  vault_audit_queue: EntityTable<OfflineVaultAudit, "id">;
};

offlineDb.version(1).stores({
  trips: "id",
  events: "id, trip_id",
  documents_meta: "id, trip_id",
  ideas: "id, trip_id",
  sync_meta: "key",
});

// PHIL-I04 : fichiers disponibles offline
offlineDb.version(2).stores({
  document_blobs: "id",
});

// PHIL-T01 Phase 4b : coffre chiffré consultable offline (métadonnées coffre +
// enveloppes maîtresse en cache pour le déverrouillage biométrique local).
offlineDb.version(3).stores({
  vault_docs_meta: "id",
  crypto_wraps: "key",
});

// PHIL-T01 Phase 5b : file d'audit des consultations offline (rejouée en ligne).
offlineDb.version(4).stores({
  vault_audit_queue: "++id",
});
