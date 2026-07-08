"use client";

import { CloudDownload, CloudOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  isVaultDocOffline,
  removeVaultDocOffline,
  saveVaultDocOffline,
} from "@/lib/offline/vault-offline";

/**
 * Toggle « Disponible offline » pour un document du coffre chiffré (PHIL-T01
 * Phase 4b). Range le chiffré + la DEK emballée + les enveloppes maîtresse en
 * cache, pour une lecture hors ligne après biométrie locale.
 */
export function OfflineVaultToggle({ documentId }: { documentId: string }) {
  const t = useT();
  const [offline, setOffline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    isVaultDocOffline(documentId).then(setOffline);
  }, [documentId]);

  function toggle() {
    setError(null);
    startTransition(async () => {
      if (offline) {
        await removeVaultDocOffline(documentId);
        setOffline(false);
      } else {
        const result = await saveVaultDocOffline(documentId);
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
