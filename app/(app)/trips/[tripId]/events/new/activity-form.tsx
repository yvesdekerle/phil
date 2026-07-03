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
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, setState] = useState<CreateEventState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    formData.set("timezone", timezone);
    if (prefill) {
      formData.set("ideaId", prefill.ideaId);
    }
    startTransition(async () => {
      setState(await createActivityEvent({ status: "idle" }, formData));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          defaultValue={prefill?.title}
          placeholder="Plongée épave Stella Maru"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Input
          id="description"
          name="description"
          defaultValue={prefill?.description}
          placeholder="Deux bouteilles, niveau 1 requis…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locationName">Lieu (optionnel)</Label>
        <Input
          id="locationName"
          name="locationName"
          defaultValue={prefill?.locationName}
          placeholder="Trou-aux-Biches"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">Début (heure locale)</Label>
          <Input id="startsAtLocal" name="startsAtLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="durationMinutes">Durée estimée en minutes (optionnel)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            defaultValue={prefill?.durationMinutes}
            type="number"
            min={5}
            placeholder="120"
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

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cost">Coût (optionnel)</Label>
          <Input
            id="cost"
            name="cost"
            defaultValue={prefill?.cost}
            type="number"
            min={0}
            step="0.01"
            placeholder="45"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="costCurrency">Devise</Label>
          <Input
            id="costCurrency"
            name="costCurrency"
            defaultValue={prefill?.costCurrency}
            placeholder="EUR"
            maxLength={3}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="externalUrl">Lien (optionnel)</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            defaultValue={prefill?.externalUrl}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Phil note l'activité…" : "Ajouter l'activité"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
