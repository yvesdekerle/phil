"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTripDocument } from "./actions";

/** Bouton de suppression d'un document du voyage (PHIL-G04). */
export function DeleteDocButton({
  tripId,
  documentId,
  fileName,
}: {
  tripId: string;
  documentId: string;
  fileName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Supprimer ${fileName}`}
          className="text-bordeaux hover:text-bordeaux-fonce"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {fileName} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le fichier disparaîtra pour tout l'équipage, y compris des événements auxquels il est
            rattaché. Pas de retour en arrière.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-bordeaux">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Garder</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await deleteTripDocument(tripId, documentId);
                if (result.status === "error") {
                  setError(result.message ?? "Suppression impossible.");
                } else {
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Suppression…" : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
