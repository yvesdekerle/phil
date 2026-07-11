"use client";

import { Check, Copy, Globe } from "lucide-react";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { setPublicSharing } from "./actions";

/** Partage public du voyage (PHIL-P03) — OWNER uniquement. */
export function PublicShareCard({
  tripId,
  token,
  baseUrl,
}: {
  tripId: string;
  token: string | null;
  baseUrl: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const url = token ? `${baseUrl}/p/${token}` : null;

  return (
    <section className="rounded-lg border border-line bg-card px-4 py-3">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
        <Globe className="size-4 text-mist" aria-hidden="true" /> {t("settings.publicShare.title")}
      </h2>
      <p className="text-xs text-slate">{t("settings.publicShare.desc")}</p>
      {url ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-sand px-2 py-1 text-xs">{url}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? t("settings.publicShare.copied") : t("settings.publicShare.copy")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(() => setPublicSharing(tripId, false))}
          >
            {t("settings.publicShare.revoke")}
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => setPublicSharing(tripId, true))}
          >
            {pending ? t("settings.publicShare.creating") : t("settings.publicShare.createBtn")}
          </Button>
        </div>
      )}
    </section>
  );
}
