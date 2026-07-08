"use client";

import { useEffect, useState } from "react";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { decryptBytes, fromBase64 } from "@/lib/crypto/vault-crypto";

/**
 * Affiche le n° de pièce chiffré E2EE (PHIL-R10) : déchiffré EN MÉMOIRE côté
 * client avec la maîtresse (déjà déverrouillée par la porte du coffre). Rien à
 * afficher tant que le déchiffrement n'a pas abouti — un non-propriétaire (pas de
 * maîtresse) ne voit donc jamais le numéro.
 */
export function EncryptedDocumentNumber({
  prefix,
  encValue,
  iv,
}: {
  prefix: string;
  encValue: string;
  iv: string;
}) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const master = await getCoffreMaster();
        const clear = await decryptBytes(master, fromBase64(encValue), fromBase64(iv));
        if (!cancelled) {
          setValue(new TextDecoder().decode(clear));
        }
      } catch {
        // Pas de maîtresse / déchiffrement impossible → on n'affiche rien.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encValue, iv]);

  if (!value) {
    return null;
  }
  return (
    <>
      {" · "}
      {prefix} {value}
    </>
  );
}
