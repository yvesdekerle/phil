"use client";

import { Compass, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/(app)/profile/actions";
import { clearOfflineData } from "@/lib/offline/clear";

/**
 * Menu du profil (PHIL-Q31) — l'avatar ouvre un menu déroulant :
 * Profil / Exploration / Déconnexion. Ferme au clic extérieur et à Échap.
 */
export function ProfileMenu({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // PHIL-Q41 : purge la donnée locale AVANT de quitter la session
  const handleSignOut = () =>
    startSignOut(async () => {
      await clearOfflineData();
      await signOut();
    });

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex items-center gap-2.5 px-3 py-2 text-sm text-encre transition-colors hover:bg-laiton/10";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ton profil"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={34}
            height={34}
            className="rounded-full border border-laiton-clair"
          />
        ) : (
          <span className="flex size-[34px] items-center justify-center rounded-full border border-laiton-clair bg-papier text-sm text-laiton">
            {initial}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-laiton-clair bg-papier py-1 shadow-[0_8px_24px_rgba(31,42,68,0.15)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="size-4 text-encre-douce" aria-hidden="true" /> Profil
          </Link>
          <Link
            href="/explorer"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Compass className="size-4 text-encre-douce" aria-hidden="true" /> Exploration
          </Link>
          <div className="my-1 border-t border-laiton-clair/60" />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={handleSignOut}
            className={`${itemClass} w-full text-left`}
          >
            <LogOut className="size-4 text-encre-douce" aria-hidden="true" />
            {signingOut ? "Déconnexion…" : "Déconnexion"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
