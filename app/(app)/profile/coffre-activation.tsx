"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { isWebAuthnAvailable } from "@/lib/crypto/prf";
import { activateCoffre } from "@/lib/crypto/vault-keys";
import { storeCoffreKeys } from "./coffre-actions";

/**
 * Activation du coffre chiffré E2EE (PHIL-T01, Phase 0). Un clic → passkey PRF
 * (Face ID/empreinte) → génération + emballage des clés → stockage.
 * ⚠️ Le PRF n'est validé qu'ici, sur un vrai appareil.
 */
export function CoffreActivation({
  userId,
  userName,
  activated,
}: {
  userId: string;
  userName: string;
  activated: boolean;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(activated);
  const [error, setError] = useState<string | null>(null);

  const activate = () => {
    setError(null);
    start(async () => {
      try {
        if (!isWebAuthnAvailable()) {
          setError("Cet appareil ne gère pas la biométrie WebAuthn.");
          return;
        }
        const material = await activateCoffre(userId, userName || "Voyageur");
        const res = await storeCoffreKeys({ ...material, deviceLabel: "Appareil principal" });
        if (!res.ok) {
          setError(
            res.error === "already-activated"
              ? "Coffre déjà activé sur ton compte."
              : `Échec : ${res.error}`,
          );
          return;
        }
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  if (done) {
    return <p className="text-sm text-ink">✓ Coffre chiffré activé sur cet appareil.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={activate} disabled={pending}>
        {pending ? "Activation…" : "Activer le coffre chiffré"}
      </Button>
      {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}
    </div>
  );
}
