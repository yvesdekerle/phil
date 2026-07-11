"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { createRecoveryWrap } from "@/lib/crypto/vault-keys";
import { storeRecoveryWrap } from "./coffre-actions";

/**
 * Code de secours du coffre (PHIL-T01, Phase 4). Emballe la maîtresse avec une
 * clé dérivée d'un code aléatoire (PBKDF2) — filet pour récupérer le coffre en
 * cas de perte de TOUS les appareils. Le code n'est affiché qu'une fois.
 */
export function CoffreRecovery({ hasRecovery }: { hasRecovery: boolean }) {
  const [pending, start] = useTransition();
  const [code, setCode] = useState<string | null>(null);
  const [done, setDone] = useState(hasRecovery);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    start(async () => {
      try {
        const master = await getCoffreMaster();
        const rec = await createRecoveryWrap(master);
        const res = await storeRecoveryWrap({
          wrappedKey: rec.wrappedKey,
          wrapIv: rec.wrapIv,
          salt: rec.salt,
        });
        if (!res.ok) {
          setError(`Échec : ${res.error}`);
          return;
        }
        setCode(rec.code);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  if (code) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">
          Note ce code et range-le en lieu sûr — il ne sera plus affiché.
        </p>
        <code className="rounded border border-line bg-sand px-3 py-2 text-center font-mono text-lg tracking-widest text-ink">
          {code}
        </code>
        <p className="text-xs text-slate">
          Il permet de récupérer ton coffre si tu perds tous tes appareils.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-slate">
        {done
          ? "Un code de secours est configuré. Tu peux en régénérer un (l'ancien sera remplacé)."
          : "Optionnel : un code de secours pour récupérer ton coffre si tu perds tous tes appareils."}
      </p>
      <Button type="button" variant="outline" onClick={generate} disabled={pending}>
        {pending
          ? "Génération…"
          : done
            ? "Régénérer un code de secours"
            : "Générer un code de secours"}
      </Button>
      {error ? <p className="text-caption text-berry-ink">{error}</p> : null}
    </div>
  );
}
