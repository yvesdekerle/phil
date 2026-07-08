"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { importTrip } from "@/app/(app)/trips/import-actions";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

/**
 * Bouton « Importer un voyage » (PHIL-Q19) sur la liste des voyages — ouvre un
 * sélecteur de fichier, lit le JSON localement et le remet à `importTrip`, qui
 * recrée le voyage puis redirige. Les erreurs remontent en toast.
 */
export function ImportTripButton() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier
    if (!file) {
      return;
    }
    const text = await file.text();
    const formData = new FormData();
    formData.set("payload", text);
    startTransition(async () => {
      const result = await importTrip({ status: "idle" }, formData);
      // En cas de succès l'action redirige (throw) ; on n'arrive ici qu'en erreur.
      if (result?.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? t("trips.import.importing") : t("trips.import.button")}
      </Button>
    </>
  );
}
