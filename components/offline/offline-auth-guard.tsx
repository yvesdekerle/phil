"use client";

import { useEffect } from "react";
import { clearOfflineData } from "@/lib/offline/clear";
import { runOfflineMaintenance } from "@/lib/offline/maintenance";
import { createClient } from "@/lib/supabase/client";

/**
 * Filet de sécurité offline (PHIL-Q41/Q55) :
 *  - purge tout le cache dès que la session passe à SIGNED_OUT ;
 *  - au chargement, fait l'entretien du cache (fichiers > 30 j, voyages terminés).
 */
export function OfflineAuthGuard() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void clearOfflineData();
      }
    });

    // Entretien du cache (best-effort, ne bloque rien)
    void runOfflineMaintenance(Date.now()).catch(() => {});

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
