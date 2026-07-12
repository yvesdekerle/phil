"use client";

import { useState, useTransition } from "react";
import { approvePairing, getPairing } from "@/app/(app)/profile/pairing-actions";
import { Button } from "@/components/ui/button";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { wrapMasterForPairing } from "@/lib/crypto/device-pairing";

/**
 * Côté appareil CONFIGURÉ (PHIL-T01, Phase 4c) : ouvert en scannant le QR du
 * nouvel appareil. Déverrouille le coffre (Face ID), emballe la maîtresse pour la
 * clé publique éphémère du nouvel appareil, et dépose le chiffré sur le relais.
 */
export function PairApprove({ pairingId }: { pairingId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = () => {
    setError(null);
    start(async () => {
      try {
        const state = await getPairing(pairingId);
        if (!state) {
          setError("Appariement introuvable ou expiré.");
          return;
        }
        if (state.status !== "awaiting") {
          setError("Cet appariement a déjà été traité.");
          return;
        }
        const master = await getCoffreMaster();
        const grant = await wrapMasterForPairing(master, state.newPublicKey as JsonWebKey);
        const res = await approvePairing(pairingId, grant);
        if (!res.ok) {
          setError(`Échec : ${res.error}`);
          return;
        }
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  if (done) {
    return (
      <p className="text-center text-sm text-ink">
        ✓ Appareil approuvé. Retourne sur le nouvel appareil : il finalise tout seul.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-slate">
        Autorise ce nouvel appareil à accéder à ton coffre. Ta clé maîtresse lui sera transmise
        chiffrée — le serveur ne la voit jamais.
      </p>
      <Button type="button" onClick={approve} disabled={pending}>
        {pending ? "Approbation…" : "Approuver ce nouvel appareil"}
      </Button>
      {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}
    </div>
  );
}
