"use client";

// Page TEMPORAIRE de démonstration des animations (M01 + M02).
// À supprimer plus tard : rm -rf "app/(app)/demo-animations"

import { useState } from "react";
import { PhilLoader } from "@/components/phil-loader";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";

export default function DemoAnimationsPage() {
  const [doorState, setDoorState] = useState<VaultDoorState>("closing");
  const [doorKey, setDoorKey] = useState(0);

  function replay(state: VaultDoorState) {
    setDoorState(state);
    setDoorKey((k) => k + 1); // remonte le composant pour rejouer l'animation
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">Démo des animations</h1>
      <p className="mt-1 mb-8 text-sm text-encre-douce">
        Page temporaire — le loader (M02) et la porte du coffre (M01).
      </p>

      <h2 className="mb-3 font-display text-xl text-encre">Le loader</h2>
      <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-2">
        <PhilLoader />
      </div>

      <h2 className="mt-10 mb-3 font-display text-xl text-encre">La porte du coffre</h2>
      <div className="rounded-lg border border-laiton-clair bg-papier px-6 py-8">
        <VaultDoor key={doorKey} state={doorState} />
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => replay("closing")}>
            Rejouer la fermeture
          </Button>
          <Button type="button" onClick={() => replay("opening")}>
            Rejouer l'ouverture
          </Button>
        </div>
      </div>
    </main>
  );
}
