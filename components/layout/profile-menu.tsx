"use client";

import { Clock3, Compass, Lightbulb, LogOut, User, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/(app)/profile/actions";
import { useT } from "@/components/i18n/provider";
import { clearOfflineData } from "@/lib/offline/clear";

/**
 * Menu du profil (PHIL-Q31, hub Profil du handoff §4) — l'avatar ouvre un menu
 * déroulant : Profil / Amis / Horloges / Conseils / Exploration / Déconnexion.
 * Ferme au clic extérieur et à Échap.
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
    "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-body text-ink transition-colors outline-none hover:bg-wash focus-visible:bg-wash";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.profileAria")}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
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
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg bg-card py-1 shadow-float"
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
            href="/friends"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Users className="size-4 text-slate" aria-hidden="true" /> {t("nav.friends")}
          </Link>
          <Link
            href="/horloges"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Clock3 className="size-4 text-slate" aria-hidden="true" /> {t("nav.clocks")}
          </Link>
          <Link
            href="/conseils"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Lightbulb className="size-4 text-slate" aria-hidden="true" /> {t("nav.tips")}
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
