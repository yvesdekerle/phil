"use client";

import { useActionState } from "react";
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
  const [state, formAction, pending] = useActionState<SheetState, FormData>(saveEmergencySheet, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 print:hidden">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="emergencyContacts">Contacts d'urgence (nom, lien, téléphone)</Label>
        <textarea
          id="emergencyContacts"
          name="emergencyContacts"
          defaultValue={defaults.emergencyContacts}
          rows={3}
          className="rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre"
          placeholder={"Marie Dupont — sœur — +33 6 12 34 56 78"}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="insurancePolicy">Assurance (contrat)</Label>
          <Input
            id="insurancePolicy"
            name="insurancePolicy"
            defaultValue={defaults.insurancePolicy}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="insurancePhone">Assisteur (tél. 24/7)</Label>
          <Input id="insurancePhone" name="insurancePhone" defaultValue={defaults.insurancePhone} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bloodGroup">Groupe sanguin (optionnel)</Label>
          <Input id="bloodGroup" name="bloodGroup" defaultValue={defaults.bloodGroup} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="allergies">Allergies (optionnel)</Label>
          <Input id="allergies" name="allergies" defaultValue={defaults.allergies} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (ambassade, médecin traitant…)</Label>
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
          {pending ? "Enregistrement…" : "Enregistrer ma fiche"}
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
