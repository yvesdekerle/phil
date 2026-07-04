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
    const channel = supabase.channel(`refresh-${key}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => router.refresh(), 400);
      });
    }
    channel.subscribe();
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [key, router]);

  return null;
}
