"use client";

import { useActionState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SheetState, saveEmergencySheet } from "./actions";

type Values = {
  emergencyContacts: string;
  insurancePolicy: string;
  insurancePhone: string;
  bloodGroup: string;
  allergies: string;
  notes: string;
};

/** Formulaire "Ma fiche d'urgence" (PHIL-N06). */
export function SheetForm({ tripId, defaults }: { tripId: string; defaults: Values }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<SheetState, FormData>(saveEmergencySheet, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 print:hidden">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="emergencyContacts">{t("emergency.form.contacts")}</Label>
        <textarea
          id="emergencyContacts"
          name="emergencyContacts"
          defaultValue={defaults.emergencyContacts}
          rows={3}
          className="rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre"
          placeholder={t("emergency.form.contactsPlaceholder")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="insurancePolicy">{t("emergency.form.insurance")}</Label>
          <Input
            id="insurancePolicy"
            name="insurancePolicy"
            defaultValue={defaults.insurancePolicy}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="insurancePhone">{t("emergency.form.assistance")}</Label>
          <Input id="insurancePhone" name="insurancePhone" defaultValue={defaults.insurancePhone} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bloodGroup">{t("emergency.form.bloodGroup")}</Label>
          <Input id="bloodGroup" name="bloodGroup" defaultValue={defaults.bloodGroup} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="allergies">{t("emergency.form.allergies")}</Label>
          <Input id="allergies" name="allergies" defaultValue={defaults.allergies} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t("emergency.form.notes")}</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={defaults.notes}
          rows={2}
          className="rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("emergency.form.saving") : t("emergency.form.save")}
        </Button>
        {state.status !== "idle" ? (
          <p
            className={
              state.status === "error" ? "text-sm text-bordeaux" : "text-sm text-encre-douce"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
