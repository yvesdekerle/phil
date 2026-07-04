"use client";

import { Check, Copy, Globe } from "lucide-react";
import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const url = token ? `${baseUrl}/p/${token}` : null;

  return (
    <section className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-encre">
        <Globe className="size-4 text-laiton" aria-hidden="true" /> Partage public
      </h2>
      <p className="text-xs text-encre-douce">
        Un lien en lecture seule pour montrer l&apos;itinéraire et la carte à ceux qui restent au
        port — jamais les documents, le budget ni les fiches d&apos;urgence.
      </p>
      {url ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-parchemin px-2 py-1 text-xs">
            {url}
          </code>
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
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(() => setPublicSharing(tripId, false))}
          >
            Révoquer
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
            {pending ? "Création…" : "Créer le lien public"}
          </Button>
        </div>
      )}
    </section>
  );
}
