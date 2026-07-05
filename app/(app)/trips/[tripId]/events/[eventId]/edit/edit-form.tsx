"use client";

import { useMemo, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    formData.set("eventId", eventId);
    formData.set("timezone", timezone);
    startTransition(async () => {
      setState(await updateEvent({ status: "idle" }, formData));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
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
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
