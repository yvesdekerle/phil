"use client";

import { useActionState, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { type EventActionState, updateEvent } from "../actions";

type Defaults = {
  title: string;
  startsAtLocal: string;
  endsAtLocal: string;
  timezone: string;
  locationName: string;
  locationAddress: string;
  externalUrl: string;
  notes: string;
};

export function EditEventForm({
  tripId,
  eventId,
  defaults,
}: {
  tripId: string;
  eventId: string;
  defaults: Defaults;
}) {
  const t = useT();
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [state, formAction, pending] = useActionState<EventActionState, FormData>(updateEvent, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="timezone" value={timezone} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("events.form.title")}</Label>
        <Input id="title" name="title" defaultValue={defaults.title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">{t("events.edit.startLocal")}</Label>
          <Input
            id="startsAtLocal"
            name="startsAtLocal"
            type="datetime-local"
            defaultValue={defaults.startsAtLocal}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsAtLocal">{t("events.edit.endLocal")}</Label>
          <Input
            id="endsAtLocal"
            name="endsAtLocal"
            type="datetime-local"
            defaultValue={defaults.endsAtLocal}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("events.form.timezone")}</Label>
        <TimezoneSelect id="timezone" value={timezone} onValueChange={setTimezone} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationName">{t("events.form.location")}</Label>
          <Input id="locationName" name="locationName" defaultValue={defaults.locationName} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationAddress">{t("events.form.address")}</Label>
          <Input
            id="locationAddress"
            name="locationAddress"
            defaultValue={defaults.locationAddress}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="externalUrl">{t("events.edit.externalUrl")}</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          placeholder={t("events.edit.urlPlaceholder")}
          defaultValue={defaults.externalUrl}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t("events.form.notes")}</Label>
        <Input id="notes" name="notes" defaultValue={defaults.notes} />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("events.edit.saving") : t("events.edit.save")}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
