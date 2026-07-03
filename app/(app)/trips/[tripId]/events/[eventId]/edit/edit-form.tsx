"use client";

import { useMemo, useState, useTransition } from "react";
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
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" defaultValue={defaults.title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">Début (heure locale)</Label>
          <Input
            id="startsAtLocal"
            name="startsAtLocal"
            type="datetime-local"
            defaultValue={defaults.startsAtLocal}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsAtLocal">Fin (heure locale, optionnel)</Label>
          <Input
            id="endsAtLocal"
            name="endsAtLocal"
            type="datetime-local"
            defaultValue={defaults.endsAtLocal}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuseau horaire</Label>
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
          <Label htmlFor="locationName">Lieu</Label>
          <Input id="locationName" name="locationName" defaultValue={defaults.locationName} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationAddress">Adresse</Label>
          <Input
            id="locationAddress"
            name="locationAddress"
            defaultValue={defaults.locationAddress}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" defaultValue={defaults.notes} />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
