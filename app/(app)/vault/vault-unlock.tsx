"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { VaultLockScreen } from "@/components/vault/vault-lock-screen";
import {
  getAuthenticationOptionsAction,
  type UnlockState,
  verifyAuthenticationAction,
} from "./unlock-actions";

/**
 * Écran de déverrouillage du coffre (PHIL-C05) — surface sombre + scan
 * Face ID du prototype (la porte animée v1 a pris sa retraite).
 */
export function VaultUnlock() {
  const t = useT();
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
        setState({ status: "error", message: t("vault.unlock.cancelled") });
      }
    });
  }

  return (
    <VaultLockScreen
      title={t("vault.unlock.lockedTitle")}
      body={t("vault.unlock.lockedBody")}
      scanning={pending}
      scanningLabel={t("vault.unlock.verifying")}
    >
      {!pending ? (
        <>
          <button
            type="button"
            onClick={unlock}
            className="inline-flex h-13 items-center gap-2.5 rounded-full bg-lagoon-ink px-6 text-subhead text-white shadow-glow transition-all outline-none hover:bg-lagoon-hover focus-visible:ring-2 focus-visible:ring-citron active:scale-[.98]"
          >
            <ScanFace aria-hidden="true" className="size-5" />
            {t("vault.unlock.button")}
          </button>
          {state.status === "error" ? (
            <p role="alert" className="text-caption text-berry-wash">
              {state.message}
            </p>
          ) : null}
          <p className="text-caption text-lagoon-soft/80">{t("vault.unlock.duration")}</p>
        </>
      ) : null}
    </VaultLockScreen>
  );
}
