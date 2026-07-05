"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Rafraîchissement temps réel (PHIL-Q03) : s'abonne aux changements Postgres
 * des tables données (RLS appliquée par Realtime — on ne reçoit que ce qu'on
 * a le droit de voir) et rafraîchit les données serveur de la page, débouncé.
 * Invisible ; échec de connexion = comportement d'avant (rechargement manuel).
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    // PHIL-Q57 : reconnexion sur erreur/timeout de canal (backoff plafonné à 30 s)
    // — sinon un CHANNEL_ERROR coupe le temps réel silencieusement jusqu'au remount.
    const connect = () => {
      channel = supabase.channel(`refresh-${key}`);
      for (const table of key.split(",")) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          if (timer.current) {
            clearTimeout(timer.current);
          }
          timer.current = setTimeout(() => router.refresh(), 400);
        });
      }
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          attempt = 0;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
          const delay = Math.min(30_000, 1000 * 2 ** attempt);
          attempt += 1;
          retry = setTimeout(connect, delay);
        }
      });
    };
    connect();

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      if (retry) {
        clearTimeout(retry);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [key, router]);

  return null;
}
