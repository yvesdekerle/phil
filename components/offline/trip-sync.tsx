"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { syncTrip } from "@/lib/offline/sync";

/**
 * Synchro offline du voyage : silencieuse à l'ouverture (PHIL-I03),
 * et automatique au retour du réseau avec notification discrète (PHIL-I06).
 */
export function TripOfflineSync({ tripId }: { tripId: string }) {
  const t = useT();
  const router = useRouter();
  const [resynced, setResynced] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (navigator.onLine) {
      syncTrip(tripId).catch((e) => {
        console.error("Synchro offline échouée:", e);
      });
    }

    const handleOnline = () => {
      // Le réseau revient : données serveur fraîches + cache local à jour.
      router.refresh();
      syncTrip(tripId)
        .then(() => {
          setResynced(true);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => setResynced(false), 4000);
        })
        .catch((e) => {
          console.error("Resynchro échouée:", e);
        });
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [tripId, router]);

  if (!resynced) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 rounded-lg border border-line bg-card px-4 py-2.5 text-sm text-ink shadow-[0_4px_20px_rgba(15,47,56,0.15)]"
    >
      {t("offline.synced")}
    </div>
  );
}
