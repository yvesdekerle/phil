"use client";

import { Compass, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/(app)/profile/actions";
import { useT } from "@/components/i18n/provider";
import { clearOfflineData } from "@/lib/offline/clear";

/**
 * Menu du profil (PHIL-Q31) — l'avatar ouvre un menu déroulant :
 * Profil / Exploration / Déconnexion. Ferme au clic extérieur et à Échap.
 */
export function ProfileMenu({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();

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
    "flex items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors hover:bg-citron/10";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.profileAria")}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={34}
            height={34}
            className="rounded-full border border-line"
          />
        ) : (
          <span className="flex size-[34px] items-center justify-center rounded-full border border-line bg-card text-sm text-mist">
            {initial}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-[0_8px_24px_rgba(15,47,56,0.15)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="size-4 text-slate" aria-hidden="true" /> {t("profileMenu.profile")}
          </Link>
          <Link
            href="/explorer"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Compass className="size-4 text-slate" aria-hidden="true" />{" "}
            {t("profileMenu.exploration")}
          </Link>
          <div className="my-1 border-t border-line/60" />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={handleSignOut}
            className={`${itemClass} w-full text-left`}
          >
            <LogOut className="size-4 text-slate" aria-hidden="true" />
            {signingOut ? t("profileMenu.signingOut") : t("profileMenu.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
