"use client";

import { CloudDownload, CloudOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  isDocumentOffline,
  removeDocumentOffline,
  saveDocumentOffline,
} from "@/lib/offline/documents";

/** Toggle « Disponible offline » sur un document (PHIL-I04). */
export function OfflineDocToggle({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const t = useT();
  const [offline, setOffline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    isDocumentOffline(documentId).then(setOffline);
  }, [documentId]);

  function toggle() {
    setError(null);
    startTransition(async () => {
      if (offline) {
        await removeDocumentOffline(documentId);
        setOffline(false);
      } else {
        const result = await saveDocumentOffline(documentId, fileName);
        if (result.ok) {
          setOffline(true);
        } else {
          setError(result.message);
        }
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant={offline ? "secondary" : "outline"}
        size="sm"
        disabled={pending || offline === null}
        onClick={toggle}
      >
        {offline ? (
          <>
            <CloudOff aria-hidden="true" /> {t("offline.removeOffline")}
          </>
        ) : (
          <>
            <CloudDownload aria-hidden="true" /> {t("offline.availableOffline")}
          </>
        )}
      </Button>
      {offline ? (
        <span className="rounded-full bg-encre/10 px-2 py-0.5 text-xs font-medium text-encre">
          {t("offline.offlineBadge")}
        </span>
      ) : null}
      {error ? <span className="text-xs text-bordeaux">{error}</span> : null}
    </span>
  );
}
