"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { primeCoffreMaster } from "@/lib/crypto/coffre-session";
import {
  createPairingRequest,
  type PairingGrant,
  unwrapMasterFromPairing,
} from "@/lib/crypto/device-pairing";
import { isWebAuthnAvailable } from "@/lib/crypto/prf";
import { enrollDevice } from "@/lib/crypto/vault-keys";
import { getMyMasterWraps, storeDeviceWrap } from "./coffre-actions";
import { consumePairing, createPairing, getPairing } from "./pairing-actions";

/**
 * Ajout de CET appareil au coffre via un appareil déjà configuré (PHIL-T01,
 * Phase 4c). Cet appareil (neuf) génère une paire éphémère, affiche un QR vers la
 * page d'approbation, et attend que l'appareil configuré y dépose la maîtresse
 * emballée. Il la déballe puis enrôle sa biométrie. Le serveur ne voit jamais la
 * maîtresse en clair.
 */
type Phase = "idle" | "waiting" | "enrolling" | "done";

export function CoffreAddDevice({ userId, userName }: { userId: string; userName: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const privateKeyRef = useRef<CryptoKey | null>(null);
  const pairingIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const finish = useCallback(
    async (grant: PairingGrant) => {
      if (busyRef.current || !privateKeyRef.current || !pairingIdRef.current) {
        return;
      }
      busyRef.current = true;
      stopPolling();
      setPhase("enrolling");
      try {
        const master = await unwrapMasterFromPairing(privateKeyRef.current, grant);
        const wraps = await getMyMasterWraps();
        const material = await enrollDevice(
          userId,
          userName || "Voyageur",
          master,
          wraps[0]?.prfSalt,
        );
        const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        const res = await storeDeviceWrap({
          deviceLabel: `Appareil apparié ${suffix}`,
          ...material,
        });
        if (!res.ok) {
          setError(`Échec de l'enregistrement : ${res.error}`);
          setPhase("waiting");
          busyRef.current = false;
          return;
        }
        primeCoffreMaster(master);
        await consumePairing(pairingIdRef.current);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
        setPhase("waiting");
        busyRef.current = false;
      }
    },
    [stopPolling, userId, userName],
  );

  const start = useCallback(async () => {
    setError(null);
    if (!isWebAuthnAvailable()) {
      setError("Cet appareil ne gère pas la biométrie WebAuthn.");
      return;
    }
    try {
      const req = await createPairingRequest();
      privateKeyRef.current = req.privateKey;
      const created = await createPairing(req.ephemeralPublicJwk);
      if (!created.ok) {
        setError(`Impossible d'ouvrir l'appariement : ${created.error}`);
        return;
      }
      pairingIdRef.current = created.pairingId;
      const url = `${window.location.origin}/coffre/pair/approve?pid=${created.pairingId}`;
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1 }));
      setPhase("waiting");

      pollRef.current = setInterval(async () => {
        const state = await getPairing(created.pairingId);
        if (!state) {
          stopPolling();
          setError("Appariement expiré — relance l'opération.");
          setPhase("idle");
          return;
        }
        if (
          state.status === "approved" &&
          state.configuredPublicKey &&
          state.wrappedMaster &&
          state.wrapIv
        ) {
          void finish({
            configuredPublicJwk: state.configuredPublicKey as JsonWebKey,
            wrappedMaster: state.wrappedMaster,
            iv: state.wrapIv,
          });
        }
      }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [finish, stopPolling]);

  if (phase === "done") {
    return (
      <p className="text-sm text-ink">
        ✓ Appareil ajouté au coffre. Ta biométrie le déverrouille désormais ici.
      </p>
    );
  }

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-slate">
          Nouvel appareil sans code de secours ? Ajoute-le depuis un appareil déjà configuré.
        </p>
        <Button type="button" variant="outline" onClick={() => void start()}>
          Ajouter cet appareil via un autre appareil
        </Button>
        {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {qr ? (
        // biome-ignore lint/performance/noImgElement: data URL générée en mémoire, pas un endpoint optimisable
        <img src={qr} alt="QR d'appariement" className="rounded border border-line" />
      ) : null}
      <p className="text-sm text-slate">
        {phase === "enrolling"
          ? "Appareil approuvé — enrôlement de ta biométrie…"
          : "Scanne ce QR avec un appareil où ton coffre est déjà déverrouillé, puis approuve."}
      </p>
      {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}
    </div>
  );
}
