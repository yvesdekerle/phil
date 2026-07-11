"use client";

import { ScanFace } from "lucide-react";

/**
 * Surface verrouillée du coffre (prototype) — plein écran sombre ink-deep,
 * cadre de scan lagune pulsant, ligne de balayage citron pendant la
 * vérification, textes secondaires en lagoon-soft. Remplace la porte animée
 * v1 (PHIL-M01). Purement présentational : les enfants portent l'action
 * (bouton Déverrouiller, erreur…).
 */
export function VaultLockScreen({
  title,
  body,
  scanning = false,
  scanningLabel,
  children,
}: {
  title: string;
  body?: string;
  /** Vérification biométrique en cours : ligne de scan + label mono citron. */
  scanning?: boolean;
  scanningLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(600px_400px_at_50%_30%,var(--ink),var(--ink-deep))] px-8 py-16 text-center">
      <div className="relative flex size-33 items-center justify-center">
        <span
          aria-hidden="true"
          className="animate-ring-pulse absolute inset-0 rounded-[32px] border-2 border-lagoon"
        />
        {scanning ? (
          <span
            aria-hidden="true"
            className="animate-scan-move absolute inset-x-[14%] h-0.5 rounded-full bg-gradient-to-r from-transparent via-citron to-transparent shadow-[0_0_12px_var(--citron)]"
          />
        ) : null}
        <ScanFace aria-hidden="true" className="size-13 text-white" strokeWidth={1.4} />
      </div>
      <h1 className="mt-8 text-title text-white">{title}</h1>
      {scanning && scanningLabel ? (
        <p className="animate-dot-blink mt-3.5 font-mono text-ui text-citron uppercase">
          {scanningLabel}
        </p>
      ) : body ? (
        <p className="mt-2 max-w-60 text-body text-lagoon-soft">{body}</p>
      ) : null}
      {children ? <div className="mt-8 flex flex-col items-center gap-3">{children}</div> : null}
    </main>
  );
}
