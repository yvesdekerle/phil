"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { cn } from "@/lib/utils";

/**
 * V07d — pont entre les cartes d'idées et la carte : la liste est rendue côté
 * serveur, le focus est un état client partagé. Cliquer la pastille numérotée
 * d'une idée zoome la carte sur son lieu (même mécanique que la page Carte).
 */

type FocusContext = {
  focusId: string | null;
  focusNonce: number;
  focus: (id: string) => void;
};

const IdeasMapFocusContext = createContext<FocusContext | null>(null);

export function IdeasMapFocusProvider({ children }: { children: ReactNode }) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const focus = (id: string) => {
    setFocusId(id);
    setFocusNonce((n) => n + 1);
  };
  return (
    <IdeasMapFocusContext.Provider value={{ focusId, focusNonce, focus }}>
      {children}
    </IdeasMapFocusContext.Provider>
  );
}

function useIdeasMapFocus(): FocusContext {
  const ctx = useContext(IdeasMapFocusContext);
  if (!ctx) {
    throw new Error("useIdeasMapFocus hors de IdeasMapFocusProvider");
  }
  return ctx;
}

export function IdeasMap({
  markers,
  distanceFrom,
}: {
  markers: MapMarker[];
  distanceFrom: { lat: number; lng: number; label: string } | null;
}) {
  const { focusId, focusNonce } = useIdeasMapFocus();
  return (
    <div id="ideas-map" className="scroll-mt-4">
      <TripMapLazy
        markers={markers}
        distanceFrom={distanceFrom}
        focusId={focusId}
        focusNonce={focusNonce}
        heightClass="h-[24rem] lg:h-[calc(100vh-8rem)]"
      />
    </div>
  );
}

/** Pastille numérotée d'une idée — assortie à son marqueur sur la carte. */
export function IdeaLocateButton({
  ideaId,
  number,
  label,
}: {
  ideaId: string;
  number: number;
  label: string;
}) {
  const { focusId, focus } = useIdeasMapFocus();
  return (
    <button
      type="button"
      title={label}
      aria-label={`${label} — ${number}`}
      onClick={() => {
        focus(ideaId);
        // Mobile : la carte est au-dessus de la liste, on la ramène à l'écran.
        document
          .getElementById("ideas-map")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-ink text-xs font-bold text-card transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        focusId === ideaId && "ring-2 ring-citron ring-offset-2 ring-offset-card",
      )}
    >
      {number}
    </button>
  );
}
