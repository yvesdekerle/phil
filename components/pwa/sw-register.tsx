"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Enregistre le service worker (prod uniquement) et affiche la bannière
 * « Nouvelle version disponible » quand un nouveau worker attend (PHIL-I02).
 */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          setWaiting(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      })
      .catch((e) => {
        console.error("Enregistrement du service worker impossible:", e);
      });
  }, []);

  if (!waiting) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3 shadow-[0_4px_20px_rgba(31,42,68,0.15)]">
      <p className="text-sm text-encre">Nouvelle version disponible.</p>
      <Button type="button" size="sm" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
        Mettre à jour
      </Button>
    </div>
  );
}
