"use client";

import { ArchiveRestore, ArchiveX } from "lucide-react";
import { useTransition } from "react";
import { setIdeaDismissed } from "@/app/(app)/trips/[tripId]/ideas/actions";
import { useT } from "@/components/i18n/provider";

/** Écarter / ressortir une idée (PHIL-H05). */
export function DismissButton({
  tripId,
  ideaId,
  dismissed,
}: {
  tripId: string;
  ideaId: string;
  dismissed: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setIdeaDismissed(tripId, ideaId, !dismissed))}
      className="flex items-center gap-1.5 rounded-full border border-laiton-clair bg-papier px-3 py-1.5 text-sm font-medium text-encre-douce transition-colors hover:text-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton disabled:opacity-60"
    >
      {dismissed ? (
        <>
          <ArchiveRestore className="size-4" aria-hidden="true" />
          {t("ideas.restore")}
        </>
      ) : (
        <>
          <ArchiveX className="size-4" aria-hidden="true" />
          {t("ideas.dismiss")}
        </>
      )}
    </button>
  );
}
