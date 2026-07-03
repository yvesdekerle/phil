"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";
import {
  getAuthenticationOptionsAction,
  type UnlockState,
  verifyAuthenticationAction,
} from "./unlock-actions";

/** Écran de déverrouillage du coffre (PHIL-C05, animé par PHIL-M01). */
export function VaultUnlock() {
  const router = useRouter();
  const [state, setState] = useState<UnlockState>({ status: "idle" });
  // La porte se referme à l'arrivée (verrouillage), s'ouvre après Touch ID.
  const [doorState, setDoorState] = useState<VaultDoorState>("closing");
  const [pending, startTransition] = useTransition();

  function unlock() {
    setState({ status: "idle" });
    startTransition(async () => {
      try {
        const options = await getAuthenticationOptionsAction();
        const response = await startAuthentication({ optionsJSON: options });
        const result = await verifyAuthenticationAction(response);
        setState(result);
        if (result.status === "idle") {
          setDoorState("opening");
          // Laisse la roue tourner et la porte pivoter avant d'entrer.
          setTimeout(() => router.refresh(), 1800);
        }
      } catch (e) {
        console.error(e);
        setState({ status: "error", message: "Déverrouillage annulé." });
      }
    });
  }

  const opening = doorState === "opening";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-laiton-clair bg-papier px-8 py-10 text-center shadow-[0_2px_16px_rgba(31,42,68,0.08)]">
        <VaultDoor state={doorState} />
        <h1 className="mt-5 font-display text-2xl text-encre italic">
          {opening ? "Bienvenue dans ton coffre" : "Coffre verrouillé"}
        </h1>
        <p className="mt-2 mb-6 text-sm text-encre-douce">
          {opening
            ? "La porte pivote sur ses gonds…"
            : "Phil garde tes papiers sous clé — déverrouille avec Face ID ou Touch ID."}
        </p>
        {!opening ? (
          <>
            <Button type="button" className="w-full" disabled={pending} onClick={unlock}>
              {pending ? "Vérification…" : "Déverrouiller le coffre"}
            </Button>
            {state.status === "error" ? (
              <p role="alert" className="mt-3 text-sm text-bordeaux">
                {state.message}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-encre-douce">Le coffre reste ouvert 15 minutes.</p>
          </>
        ) : null}
      </div>
    </main>
  );
}
