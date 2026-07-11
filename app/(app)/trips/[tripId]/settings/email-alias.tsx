"use client";

import { Mail } from "lucide-react";
import { useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { generateEmailAlias } from "./actions";

/** Adresse d'import par email du voyage (PHIL-P02). */
export function EmailAliasCard({
  tripId,
  alias,
  domain,
}: {
  tripId: string;
  alias: string | null;
  domain: string | null;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const address = alias ? `${alias}@${domain ?? "…"}` : null;

  return (
    <section className="rounded-lg border border-line bg-card px-4 py-3">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
        <Mail className="size-4 text-mist" aria-hidden="true" /> {t("settings.email.title")}
      </h2>
      {alias ? (
        <>
          <p className="text-sm text-ink">
            {t("settings.email.forward")}{" "}
            <code className="rounded bg-sand px-1.5 py-0.5 text-xs">{address}</code>
          </p>
          <p className="mt-1 text-xs text-slate">
            {t("settings.email.note")}
            {domain ? "" : t("settings.email.noteDomain")}
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate">{t("settings.email.create")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => generateEmailAlias(tripId))}
          >
            {pending ? t("settings.email.creating") : t("settings.email.createBtn")}
          </Button>
        </div>
      )}
    </section>
  );
}
