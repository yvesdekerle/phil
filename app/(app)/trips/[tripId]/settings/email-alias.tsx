"use client";

import { Mail } from "lucide-react";
import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const address = alias ? `${alias}@${domain ?? "…"}` : null;

  return (
    <section className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-encre">
        <Mail className="size-4 text-laiton" aria-hidden="true" /> Import par email
      </h2>
      {alias ? (
        <>
          <p className="text-sm text-encre">
            Transfère tes confirmations à{" "}
            <code className="rounded bg-parchemin px-1.5 py-0.5 text-xs">{address}</code>
          </p>
          <p className="mt-1 text-xs text-encre-douce">
            Seuls les emails des participants sont acceptés ; chaque réservation arrive en "à
            valider" dans Importer une confirmation.
            {domain ? "" : " Réception active dès que le domaine d'import sera configuré."}
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-encre-douce">
            Crée l'adresse du voyage pour pouvoir y transférer tes confirmations de réservation.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => generateEmailAlias(tripId))}
          >
            {pending ? "Création…" : "Créer l'adresse"}
          </Button>
        </div>
      )}
    </section>
  );
}
