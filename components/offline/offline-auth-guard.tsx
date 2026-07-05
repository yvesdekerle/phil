"use client";

import { useEffect } from "react";
import { clearOfflineData } from "@/lib/offline/clear";
import { createClient } from "@/lib/supabase/client";

/**
 * Filet de sécurité (PHIL-Q41) : purge la donnée locale dès que la session
 * Supabase passe à SIGNED_OUT (déconnexion, expiration, révocation), au cas où
 * la purge explicite du bouton de déconnexion n'aurait pas eu lieu.
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
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
