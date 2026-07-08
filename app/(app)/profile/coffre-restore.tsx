"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { primeCoffreMaster } from "@/lib/crypto/coffre-session";
import { isWebAuthnAvailable } from "@/lib/crypto/prf";
import { enrollDevice, unwrapMasterFromRecovery } from "@/lib/crypto/vault-keys";
import { getMyMasterWraps, getMyRecoveryWrap, storeDeviceWrap } from "./coffre-actions";

/**
 * Restauration du coffre sur un nouvel appareil via le code de secours (PHIL-T01,
 * Phase 4a). Déballe la maîtresse à partir du code (PBKDF2, hors ligne côté
 * serveur — le code ne quitte jamais le navigateur) puis ré-enrôle la biométrie
 * de cet appareil (nouvelle enveloppe PRF). Ne remplace jamais la maîtresse : on
 * ne fait qu'ajouter une façon de la déverrouiller ici.
 */
export function CoffreRestore({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = () => {
    setError(null);
    start(async () => {
      try {
        if (!isWebAuthnAvailable()) {
          setError("Cet appareil ne gère pas la biométrie WebAuthn.");
          return;
        }
        const rec = await getMyRecoveryWrap();
        if (!rec) {
          setError("Aucun code de secours n'est configuré sur ce compte.");
          return;
        }

        let master: CryptoKey;
        try {
          master = await unwrapMasterFromRecovery(rec, code);
        } catch {
          setError("Code de secours invalide — vérifie ta saisie.");
          return;
        }

        // Sel PRF partagé avec les appareils existants (garde `unlockMaster` cohérent).
        const wraps = await getMyMasterWraps();
        const sharedSalt = wraps[0]?.prfSalt;

        const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        const material = await enrollDevice(userId, userName || "Voyageur", master, sharedSalt);
        const res = await storeDeviceWrap({
          deviceLabel: `Appareil restauré ${suffix}`,
          ...material,
        });
        if (!res.ok) {
          setError(`Échec de l'enregistrement : ${res.error}`);
          return;
        }

        primeCoffreMaster(master);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  if (done) {
    return (
      <p className="text-sm text-encre">
        ✓ Coffre restauré sur cet appareil. Ta biométrie le déverrouille désormais ici.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        Nouvel appareil ? Restaurer avec ton code de secours
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-encre-douce">
        Saisis ton code de secours pour redonner accès au coffre sur cet appareil. Un Face ID /
        empreinte suivra pour l'enrôler.
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="ABCD-2345-EFGH-6789"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="rounded border border-laiton-clair bg-papier px-3 py-2 text-center font-mono tracking-widest text-encre uppercase placeholder:text-encre-douce/50"
      />
      <div className="flex items-center gap-2">
        <Button type="button" onClick={restore} disabled={pending || code.trim().length === 0}>
          {pending ? "Restauration…" : "Restaurer le coffre"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
    </div>
  );
}
