"use client";

import { useEffect, useState } from "react";

/**
 * Détection de l'état réseau (PHIL-I05) : navigator.onLine + événements,
 * confirmé par un ping léger sur /api/health toutes les 30 s.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const ping = async () => {
      try {
        await fetch("/api/health", { method: "HEAD", cache: "no-store" });
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };
    const interval = setInterval(() => {
      // On ne confirme par ping que si le navigateur se dit hors ligne
      // ou si l'onglet vient de reprendre la main.
      if (!navigator.onLine || document.visibilityState === "visible") {
        void ping();
      }
    }, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return online;
}
