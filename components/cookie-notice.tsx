"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "phil-cookie-notice-seen";

/**
 * Information cookies (PHIL-J05) : Phil n'utilise que des cookies techniques
 * (authentification, verrou du coffre) — simple mention, pas de consentement
 * à recueillir puisque rien n'est optionnel ni traçant.
 */
export function CookieNotice() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage indisponible (navigation privée stricte) : ne rien afficher
    }
  }, []);

  if (!visible) {
    return null;
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // tant pis, la bannière reviendra
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3 shadow-[0_4px_20px_rgba(31,42,68,0.15)]">
      <p className="min-w-0 flex-1 text-sm text-encre-douce">
        {t("misc.cookieText")}{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          {t("misc.cookieLearnMore")}
        </Link>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={dismiss}>
        {t("misc.cookieDismiss")}
      </Button>
    </div>
  );
}
