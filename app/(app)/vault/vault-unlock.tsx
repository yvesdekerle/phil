"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  getAuthenticationOptionsAction,
  type UnlockState,
  verifyAuthenticationAction,
} from "./unlock-actions";

/** Écran de déverrouillage du coffre (PHIL-C05). */
export function VaultUnlock() {
  const router = useRouter();
  const [state, setState] = useState<UnlockState>({ status: "idle" });
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
          router.refresh();
        }
      } catch (e) {
        console.error(e);
        setState({ status: "error", message: "Déverrouillage annulé." });
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-laiton-clair bg-papier px-8 py-10 text-center shadow-[0_2px_16px_rgba(31,42,68,0.08)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-laiton-clair bg-parchemin text-laiton">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-encre italic">Coffre verrouillé</h1>
        <p className="mt-2 mb-6 text-sm text-encre-douce">
          Phil garde tes papiers sous clé — déverrouille avec Face ID ou Touch ID.
        </p>
        <Button type="button" className="w-full" disabled={pending} onClick={unlock}>
          {pending ? "Vérification…" : "Déverrouiller le coffre"}
        </Button>
        {state.status === "error" ? (
          <p role="alert" className="mt-3 text-sm text-bordeaux">
            {state.message}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-encre-douce">Le coffre reste ouvert 15 minutes.</p>
      </div>
    </main>
  );
}
