"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";

/**
 * Porte du coffre E2EE (PHIL-T01) — verrou biométrique UNIQUE. En arrivant sur le
 * coffre, la biométrie (Face ID / empreinte) se déclenche AUTOMATIQUEMENT. La clé
 * maîtresse reste ensuite en mémoire pour la session (onglet) : tant qu'on ne
 * recharge pas la page, revenir au coffre ne redemande pas la biométrie.
 * Si le navigateur bloque le prompt auto, un bouton de secours reste affiché.
 *
 * La vraie protection des données reste la RLS (serveur) + le E2EE ; cette porte
 * est la barrière biométrique sur l'appareil.
 */
export function CoffreGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [doorState, setDoorState] = useState<VaultDoorState>("closing");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      await getCoffreMaster();
      setDoorState("opening");
      setTimeout(() => setUnlocked(true), 900);
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : t("vault.unlock.cancelled"));
    }
  }, [t]);

  // Déjà déverrouillé (même onglet) → on entre. Sinon → déverrouillage AUTO.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    if (isCoffreUnlocked()) {
      setUnlocked(true);
      setChecked(true);
      return;
    }
    setChecked(true);
    void unlock();
  }, [unlock]);

  if (unlocked) {
    return <>{children}</>;
  }
  if (!checked) {
    return null;
  }

  const opening = doorState === "opening";
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-laiton-clair bg-papier px-8 py-10 text-center shadow-[0_2px_16px_rgba(31,42,68,0.08)]">
        <VaultDoor state={doorState} />
        <h1 className="mt-5 font-display text-2xl text-encre italic">
          {opening ? t("vault.unlock.openTitle") : t("vault.unlock.lockedTitle")}
        </h1>
        <p className="mt-2 mb-6 text-sm text-encre-douce">
          {opening ? t("vault.unlock.openingBody") : t("vault.unlock.lockedBody")}
        </p>
        {opening ? null : pending ? (
          <p className="text-sm text-encre-douce">{t("vault.unlock.verifying")}</p>
        ) : (
          <>
            <Button type="button" className="w-full" onClick={unlock}>
              {t("vault.unlock.button")}
            </Button>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-bordeaux">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
