"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { VaultDoor, type VaultDoorState } from "@/components/vault/vault-door";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";

/**
 * Porte du coffre E2EE (PHIL-T01) — verrou biométrique UNIQUE. Une seule
 * biométrie (Face ID / empreinte) déverrouille la clé maîtresse ; elle reste en
 * mémoire pour la session, donc tous les documents chiffrés s'ouvrent ensuite
 * directement, sans redemander. Un rechargement complet re-verrouille.
 *
 * La vraie protection des données reste la RLS (côté serveur) + le E2EE ; cette
 * porte est la barrière biométrique sur l'appareil.
 */
export function CoffreGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [doorState, setDoorState] = useState<VaultDoorState>("closing");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déjà déverrouillé dans cet onglet → on entre directement.
  useEffect(() => {
    if (isCoffreUnlocked()) {
      setUnlocked(true);
    }
    setChecked(true);
  }, []);

  const unlock = async () => {
    setError(null);
    setPending(true);
    try {
      await getCoffreMaster();
      setDoorState("opening");
      setTimeout(() => setUnlocked(true), 1400);
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : t("vault.unlock.cancelled"));
    }
  };

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
        {!opening ? (
          <>
            <Button type="button" className="w-full" disabled={pending} onClick={unlock}>
              {pending ? t("vault.unlock.verifying") : t("vault.unlock.button")}
            </Button>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-bordeaux">
                {error}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
