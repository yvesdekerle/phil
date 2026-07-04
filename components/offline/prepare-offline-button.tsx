"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { offlineDb } from "@/lib/offline/db";
import { isDocumentOffline, saveDocumentOffline } from "@/lib/offline/documents";
import { type SyncResult, syncTrip } from "@/lib/offline/sync";

/** Bouton « Préparer pour offline » avec horodatage de dernière synchro (PHIL-I03). */
export function PrepareOfflineButton({ tripId }: { tripId: string }) {
  const [last, setLast] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullStatus, setFullStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    offlineDb.sync_meta.get(`trip:${tripId}`).then((meta) => {
      if (meta) {
        setLast(meta);
      }
    });
  }, [tripId]);

  function prepare() {
    setError(null);
    setFullStatus(null);
    startTransition(async () => {
      try {
        const result = await syncTrip(tripId);
        if (result) {
          setLast(result);
        } else {
          setError("Synchronisation impossible.");
        }
      } catch {
        setError("Synchronisation impossible — vérifie ta connexion.");
      }
    });
  }

  /** PHIL-Q16 : données + tous les documents du voyage d'un coup. */
  function prepareAll() {
    setError(null);
    setFullStatus(null);
    startTransition(async () => {
      try {
        const result = await syncTrip(tripId);
        if (!result) {
          setError("Synchronisation impossible.");
          return;
        }
        setLast(result);
        const docs = await offlineDb.documents_meta.where("trip_id").equals(tripId).toArray();
        let saved = 0;
        let skipped = 0;
        let failed = 0;
        for (const [i, doc] of docs.entries()) {
          setFullStatus(`Documents : ${i + 1}/${docs.length}…`);
          if (await isDocumentOffline(doc.id)) {
            skipped++;
            continue;
          }
          const r = await saveDocumentOffline(doc.id, doc.file_name);
          if (r.ok) {
            saved++;
          } else {
            failed++;
            setError(r.message);
          }
        }
        setFullStatus(
          `Tout est dans la malle : ${saved + skipped}/${docs.length} documents offline${failed > 0 ? ` (${failed} en échec)` : ""}.`,
        );
      } catch {
        setError("Préparation impossible — vérifie ta connexion.");
        setFullStatus(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">Lecture offline</p>
      <p className="text-xs text-encre-douce">
        Garde le programme, les documents et les idées consultables sans réseau — utile une fois sur
        place.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={prepare}>
          {pending ? "Phil remplit la malle…" : "Préparer pour offline"}
        </Button>
        <Button type="button" disabled={pending} onClick={prepareAll}>
          Tout préparer (documents inclus)
        </Button>
        {fullStatus ? <p className="text-xs text-encre-douce">{fullStatus}</p> : null}
        {last ? (
          <p className="text-xs text-encre-douce">
            Synchronisé le{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
              new Date(last.syncedAt),
            )}{" "}
            · {last.eventCount} événements, {last.documentCount} documents, {last.ideaCount} idées
          </p>
        ) : null}
        {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
      </div>
    </div>
  );
}
