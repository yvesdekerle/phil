"use client";

import { useEffect } from "react";
import { syncTrip } from "@/lib/offline/sync";

/** Synchro offline silencieuse à l'ouverture d'un voyage (PHIL-I03). */
export function TripOfflineSync({ tripId }: { tripId: string }) {
  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }
    syncTrip(tripId).catch((e) => {
      console.error("Synchro offline échouée:", e);
    });
  }, [tripId]);

  return null;
}
