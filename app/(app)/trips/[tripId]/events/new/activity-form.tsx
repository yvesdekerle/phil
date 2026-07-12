"use client";

import { useActionState, useState } from "react";
import { PlaceInput } from "@/components/geo/place-input";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { type CreateEventState, createActivityEvent } from "./actions";

export type ActivityPrefill = {
  ideaId: string;
  title: string;
  description: string;
  locationName: string;
  durationMinutes: string;
  cost: string;
  costCurrency: string;
  externalUrl: string;
};

export function ActivityForm({
  tripId,
  defaultTimezone,
  prefill,
}: {
  tripId: string;
  defaultTimezone: string;
  prefill?: ActivityPrefill;
}) {
  const t = useT();
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, formAction, pending] = useActionState<CreateEventState, FormData>(
    createActivityEvent,
    { status: "idle" },
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="timezone" value={timezone} />
      {prefill ? <input type="hidden" name="ideaId" value={prefill.ideaId} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("events.form.title")}</Label>
        <Input
          id="title"
          name="title"
          defaultValue={prefill?.title}
          placeholder={t("events.activity.titlePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("events.activity.descriptionOptional")}</Label>
        <Input
          id="description"
          name="description"
          defaultValue={prefill?.description}
          placeholder={t("events.activity.descriptionPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locationName">{t("events.activity.locationOptional")}</Label>
        <PlaceInput
          id="locationName"
          name="locationName"
          defaultValue={prefill?.locationName}
          placeholder={t("events.activity.locationPlaceholder")}
          maxLength={150}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">{t("events.activity.startLocal")}</Label>
          <Input id="startsAtLocal" name="startsAtLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="durationMinutes">{t("events.activity.duration")}</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            defaultValue={prefill?.durationMinutes}
            type="number"
            min={5}
            placeholder={t("events.activity.durationPlaceholder")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("events.form.timezone")}</Label>
        <TimezoneSelect id="timezone" value={timezone} onValueChange={setTimezone} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cost">{t("events.activity.cost")}</Label>
          <Input
            id="cost"
            name="cost"
            defaultValue={prefill?.cost}
            type="number"
            min={0}
            step="0.01"
            placeholder={t("events.activity.costPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="costCurrency">{t("events.activity.currency")}</Label>
          <Input
            id="costCurrency"
            name="costCurrency"
            defaultValue={prefill?.costCurrency}
            placeholder={t("events.activity.currencyPlaceholder")}
            maxLength={3}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="externalUrl">{t("events.activity.link")}</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            defaultValue={prefill?.externalUrl}
            placeholder={t("events.activity.linkPlaceholder")}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("events.activity.submitting") : t("events.activity.submit")}
        </Button>
        {state.status === "error" ? (
          <p className="text-caption text-berry-ink">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
