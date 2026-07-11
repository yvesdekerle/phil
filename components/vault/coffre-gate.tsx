"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";

/**
 * Entrée du coffre E2EE (PHIL-T01). Le contenu reste CACHÉ tant que la biométrie
 * (Face ID / empreinte) n'a pas réussi — elle se déclenche automatiquement à
 * l'arrivée. Écran minimal pendant la vérification (pas de porte). La clé reste
 * ensuite en mémoire pour la session (onglet) : revenir au coffre ne redemande
 * rien tant qu'on ne recharge pas. Si le prompt auto est bloqué, un bouton reste.
 */
export function CoffreGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);

  const unlock = useCallback(async () => {
    setFailed(false);
    try {
      await getCoffreMaster();
      setUnlocked(true);
    } catch {
      setFailed(true);
    }
  }, []);

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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      {failed ? (
        <>
          <p className="max-w-xs text-sm text-slate">{t("vault.unlock.lockedBody")}</p>
          <Button type="button" onClick={() => void unlock()}>
            {t("vault.unlock.button")}
          </Button>
        </>
      ) : (
        <p className="text-sm text-slate">{t("vault.unlock.verifying")}</p>
      )}
    </main>
  );
}
