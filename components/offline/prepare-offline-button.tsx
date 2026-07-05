"use client";

import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { offlineDb } from "@/lib/offline/db";
import { isDocumentOffline, saveDocumentOffline } from "@/lib/offline/documents";
import { type SyncResult, syncTrip } from "@/lib/offline/sync";

/** Bouton « Préparer pour offline » avec horodatage de dernière synchro (PHIL-I03). */
export function PrepareOfflineButton({ tripId }: { tripId: string }) {
  const t = useT();
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
          setError(t("offline.syncFailed"));
        }
      } catch {
        setError(t("offline.syncFailedNet"));
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
          setError(t("offline.syncFailed"));
          return;
        }
        setLast(result);
        const docs = await offlineDb.documents_meta.where("trip_id").equals(tripId).toArray();
        let saved = 0;
        let skipped = 0;
        let failed = 0;
        for (const [i, doc] of docs.entries()) {
          setFullStatus(
            t("offline.docsProgress")
              .replace("{current}", String(i + 1))
              .replace("{total}", String(docs.length)),
          );
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
        const base = t("offline.allSaved")
          .replace("{done}", String(saved + skipped))
          .replace("{total}", String(docs.length));
        const suffix =
          failed > 0 ? t("offline.allSavedFailed").replace("{failed}", String(failed)) : "";
        setFullStatus(`${base}${suffix}.`);
      } catch {
        setError(t("offline.prepareFailed"));
        setFullStatus(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">{t("offline.prepareTitle")}</p>
      <p className="text-xs text-encre-douce">{t("offline.prepareHint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={prepare}>
          {pending ? t("offline.preparing") : t("offline.prepare")}
        </Button>
        <Button type="button" disabled={pending} onClick={prepareAll}>
          {t("offline.prepareAll")}
        </Button>
        {fullStatus ? <p className="text-xs text-encre-douce">{fullStatus}</p> : null}
        {last ? (
          <p className="text-xs text-encre-douce">
            {t("offline.syncedAt")}{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
              new Date(last.syncedAt),
            )}{" "}
            ·{" "}
            {t("offline.syncSummary")
              .replace("{events}", String(last.eventCount))
              .replace("{documents}", String(last.documentCount))
              .replace("{ideas}", String(last.ideaCount))}
          </p>
        ) : null}
        {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
      </div>
    </div>
  );
}
