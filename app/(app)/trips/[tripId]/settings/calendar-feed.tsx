"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

/** Abonnement agenda iCal (PHIL-N02) : URL personnelle copiable. */
export function CalendarFeed({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">{t("settings.calendar.title")}</p>
      <p className="text-xs text-encre-douce">{t("settings.calendar.desc")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-laiton-clair/60 bg-parchemin/50 px-2 py-1.5 text-xs text-encre-douce">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? t("settings.calendar.copied") : t("settings.calendar.copy")}
        </Button>
      </div>
    </div>
  );
}
