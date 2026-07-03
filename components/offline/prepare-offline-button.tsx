"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { offlineDb } from "@/lib/offline/db";
import { type SyncResult, syncTrip } from "@/lib/offline/sync";

/** Bouton « Préparer pour offline » avec horodatage de dernière synchro (PHIL-I03). */
export function PrepareOfflineButton({ tripId }: { tripId: string }) {
  const [last, setLast] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
