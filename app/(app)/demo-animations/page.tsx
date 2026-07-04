"use client";

// Page TEMPORAIRE de démonstration des animations (M01 + M02).
// Non commitée — à supprimer après visionnage : rm -rf "app/(app)/demo-animations"

import { useState } from "react";
import { PhilLoader, type PhilLoaderScene } from "@/components/phil-loader";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";

const SCENES: { key: PhilLoaderScene; label: string }[] = [
  { key: "balloon", label: "Montgolfière — Cinq semaines en ballon" },
  { key: "globe", label: "Le globe de l'explorateur" },
];

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
        Page temporaire — les loaders (M02, images gravées) et la porte du coffre (M01).
      </p>

      <h2 className="mb-3 font-display text-xl text-encre">Les loaders</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SCENES.map((s) => (
          <div key={s.key} className="rounded-lg border border-laiton-clair bg-papier px-4 py-2">
            <PhilLoader scene={s.key} />
            <p className="-mt-12 pb-4 text-center text-xs text-encre-douce">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-encre-douce">
        En conditions réelles, une seule scène est tirée au sort à chaque chargement de page.
      </p>

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
