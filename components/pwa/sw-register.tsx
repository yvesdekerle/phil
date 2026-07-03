"use client";

import { useEffect } from "react";

/** Enregistre le service worker (prod uniquement — en dev il gênerait le HMR). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.error("Enregistrement du service worker impossible:", e);
    });
  }, []);

  return null;
}
