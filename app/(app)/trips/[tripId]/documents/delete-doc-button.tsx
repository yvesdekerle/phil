"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
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
  const t = useT();
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
          aria-label={`${t("tripDocs.delete")} ${fileName}`}
          className="text-bordeaux hover:text-bordeaux-fonce"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("tripDocs.confirmTitle").replace("{name}", fileName)}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("tripDocs.confirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-bordeaux">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("tripDocs.keep")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await deleteTripDocument(tripId, documentId);
                if (result.status === "error") {
                  setError(result.message ?? t("tripDocs.deleteFailed"));
                } else {
                  router.refresh();
                }
              });
            }}
          >
            {pending ? t("tripDocs.deleting") : t("tripDocs.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
