"use client";

import { useActionState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount, type ProfileFormState } from "./actions";

/** Zone dangereuse du profil (PHIL-C06). */
export function DeleteAccountSection() {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(deleteMyAccount, {
    status: "idle",
  });

  return (
    <section className="mt-8 rounded-lg border border-bordeaux/30 bg-papier px-5 py-4">
      <h2 className="text-sm font-medium text-bordeaux">Zone dangereuse</h2>
      <p className="mt-1 text-xs text-encre-douce">
        Supprime ton compte, tes documents et tes traces. Tes voyages passent au plus ancien
        équipier ; ceux où tu voyageais seul disparaissent. C'est immédiat et sans retour.
      </p>
      <div className="mt-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" className="border-bordeaux/40 text-bordeaux">
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={formAction} className="flex flex-col gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>Descendre du train pour de bon ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Compte, coffre, documents et participations seront supprimés immédiatement. Écris{" "}
                  <strong>SUPPRIMER</strong> pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmation">Confirmation</Label>
                <Input id="confirmation" name="confirmation" autoComplete="off" required />
              </div>
              {state.status === "error" ? (
                <p role="alert" className="text-sm text-bordeaux">
                  {state.message}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Rester à bord</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? "Suppression…" : "Supprimer définitivement"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
