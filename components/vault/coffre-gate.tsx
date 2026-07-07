"use client";

import { useEffect, useRef } from "react";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";

/**
 * Entrée du coffre E2EE (PHIL-T01). Plus d'écran de verrouillage : le contenu
 * s'affiche directement et la clé maîtresse est déverrouillée (biométrie) EN
 * ARRIÈRE-PLAN à la première entrée de la session — le prompt système apparaît,
 * puis les documents chiffrés s'ouvrent sans redemander.
 *
 * La clé reste en mémoire pour la session (onglet) ; un rechargement complet la
 * redemande au 1er besoin. La vraie protection reste la RLS (serveur) + le E2EE
 * (un document chiffré ne se déchiffre qu'avec la clé déverrouillée par biométrie).
 */
export function CoffreGate({ children }: { children: React.ReactNode }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current || isCoffreUnlocked()) {
      return;
    }
    started.current = true;
    // Réchauffe la maîtresse (biométrie) sans bloquer l'affichage.
    void getCoffreMaster().catch(() => {});
  }, []);

  return <>{children}</>;
}
