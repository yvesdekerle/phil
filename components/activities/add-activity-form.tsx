"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import {
  type ActivityFormState,
  addTripActivity,
} from "@/app/(app)/trips/[tripId]/activities/actions";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Ajout manuel d'une activité au pool du voyage (PHIL-U04). */
export function AddActivityForm({ tripId }: { tripId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActivityFormState, FormData>(addTripActivity, {
    status: "idle",
  });

  if (!open) {
    return (
      <div className="flex justify-center">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" />
          {t("activities.add")}
        </Button>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-sm flex-col gap-2 rounded-lg border border-laiton-clair bg-parchemin/50 p-3"
    >
      <p className="text-sm font-medium text-encre">{t("activities.addTitle")}</p>
      <input type="hidden" name="tripId" value={tripId} />
      <Input name="title" placeholder={t("activities.titlePlaceholder")} required maxLength={200} />
      <Input name="location" placeholder={t("activities.locationPlaceholder")} maxLength={200} />
      <Input name="category" placeholder={t("activities.categoryPlaceholder")} maxLength={120} />
      <textarea
        name="description"
        rows={2}
        maxLength={2000}
        placeholder={t("activities.descPlaceholder")}
        className="rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre"
      />
      <Input name="tags" placeholder={t("activities.tagsPlaceholder")} maxLength={200} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("activities.addButton")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          {t("activities.cancel")}
        </Button>
      </div>
      {state.status === "error" ? <p className="text-xs text-bordeaux">{state.message}</p> : null}
    </form>
  );
}
