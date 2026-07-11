"use client";

import { useActionState } from "react";
import { useT } from "@/components/i18n/provider";
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
  const t = useT();
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(deleteMyAccount, {
    status: "idle",
  });

  return (
    <section className="mt-8 rounded-lg border border-lagoon-ink/30 bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-lagoon-ink">{t("profile.delete.heading")}</h2>
      <p className="mt-1 text-xs text-slate">{t("profile.delete.body")}</p>
      <div className="mt-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="border-lagoon-ink/40 text-lagoon-ink"
            >
              {t("profile.delete.trigger")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form action={formAction} className="flex flex-col gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("profile.delete.dialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("profile.delete.dialogBodyPrefix")}{" "}
                  <strong>{t("profile.delete.confirmWord")}</strong>{" "}
                  {t("profile.delete.dialogBodySuffix")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmation">{t("profile.delete.confirmLabel")}</Label>
                <Input id="confirmation" name="confirmation" autoComplete="off" required />
              </div>
              {state.status === "error" ? (
                <p role="alert" className="text-sm text-lagoon-ink">
                  {state.message}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel type="button">{t("profile.delete.cancel")}</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? t("profile.delete.deleting") : t("profile.delete.confirm")}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
