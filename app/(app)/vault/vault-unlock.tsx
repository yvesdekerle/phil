"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";
import {
  getAuthenticationOptionsAction,
  type UnlockState,
  verifyAuthenticationAction,
} from "./unlock-actions";

/** Écran de déverrouillage du coffre (PHIL-C05, animé par PHIL-M01). */
export function VaultUnlock() {
  const t = useT();
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
        setState({ status: "error", message: t("vault.unlock.cancelled") });
      }
    });
  }

  const opening = doorState === "opening";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card px-8 py-10 text-center shadow-[0_2px_16px_rgba(15,47,56,0.08)]">
        <VaultDoor state={doorState} />
        <h1 className="mt-5 font-sans text-2xl text-ink italic">
          {opening ? t("vault.unlock.openTitle") : t("vault.unlock.lockedTitle")}
        </h1>
        <p className="mt-2 mb-6 text-sm text-slate">
          {opening ? t("vault.unlock.openingBody") : t("vault.unlock.lockedBody")}
        </p>
        {!opening ? (
          <>
            <Button type="button" className="w-full" disabled={pending} onClick={unlock}>
              {pending ? t("vault.unlock.verifying") : t("vault.unlock.button")}
            </Button>
            {state.status === "error" ? (
              <p role="alert" className="mt-3 text-sm text-lagoon-ink">
                {state.message}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-slate">{t("vault.unlock.duration")}</p>
          </>
        ) : null}
      </div>
    </main>
  );
}
