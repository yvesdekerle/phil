"use client";

import { ScanFace } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { VaultLockScreen } from "@/components/vault/vault-lock-screen";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";

/**
 * Entrée du coffre E2EE (PHIL-T01). Le contenu reste CACHÉ tant que la biométrie
 * (Face ID / empreinte) n'a pas réussi — elle se déclenche automatiquement à
 * l'arrivée, sur la surface sombre de scan du prototype. La clé reste ensuite
 * en mémoire pour la session (onglet). Si le prompt auto est bloqué, un bouton
 * reste.
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
    <VaultLockScreen
      title={t("vault.unlock.lockedTitle")}
      body={failed ? t("vault.unlock.lockedBody") : undefined}
      scanning={!failed}
      scanningLabel={t("vault.unlock.verifying")}
    >
      {failed ? (
        <button
          type="button"
          onClick={() => void unlock()}
          className="inline-flex h-13 items-center gap-2.5 rounded-full bg-lagoon-ink px-6 text-subhead text-white shadow-glow transition-all outline-none hover:bg-lagoon-hover focus-visible:ring-2 focus-visible:ring-citron active:scale-[.98]"
        >
          <ScanFace aria-hidden="true" className="size-5" />
          {t("vault.unlock.button")}
        </button>
      ) : null}
    </VaultLockScreen>
  );
}
