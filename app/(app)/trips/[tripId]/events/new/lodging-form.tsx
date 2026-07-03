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
import {
  LODGING_PLATFORM_LABELS,
  LODGING_PLATFORMS,
  type LodgingPlatform,
} from "@/lib/events/lodging";
import { type CreateEventState, createLodgingEvent } from "./actions";

export function LodgingForm({
  tripId,
  defaultTimezone,
}: {
  tripId: string;
  defaultTimezone: string;
}) {
  const [platform, setPlatform] = useState<LodgingPlatform>("booking");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, setState] = useState<CreateEventState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    formData.set("platform", platform);
    formData.set("timezone", timezone);
    startTransition(async () => {
      setState(await createLodgingEvent({ status: "idle" }, formData));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom de l'hébergement</Label>
        <Input id="name" name="name" placeholder="Villa Trou-aux-Biches" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Adresse (optionnel)</Label>
        <Input id="address" name="address" placeholder="Route côtière, Trou-aux-Biches" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkInLocal">Check-in</Label>
          <Input id="checkInLocal" name="checkInLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkOutLocal">Check-out</Label>
          <Input id="checkOutLocal" name="checkOutLocal" type="datetime-local" />
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
          <Label htmlFor="platform">Plateforme</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as LodgingPlatform)}>
            <SelectTrigger id="platform" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LODGING_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {LODGING_PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="guests">Nombre de voyageurs (optionnel)</Label>
          <Input id="guests" name="guests" type="number" min={1} max={50} placeholder="9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookingReference">N° de réservation (optionnel)</Label>
          <Input id="bookingReference" name="bookingReference" placeholder="HM8Q2K" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Input id="notes" name="notes" placeholder="Clés à la réception…" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Phil réserve la chambre…" : "Ajouter l'hébergement"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
