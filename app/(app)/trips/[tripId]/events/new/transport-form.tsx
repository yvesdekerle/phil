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
  suggestTransportTitle,
  TRANSPORT_MODE_LABELS,
  TRANSPORT_MODES,
  type TransportMode,
} from "@/lib/events/transport";
import { type CreateEventState, createTransportEvent } from "./actions";

export function TransportForm({
  tripId,
  defaultTimezone,
}: {
  tripId: string;
  defaultTimezone: string;
}) {
  const [mode, setMode] = useState<TransportMode>("plane");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, setState] = useState<CreateEventState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  const effectiveTitle = titleTouched ? title : suggestTransportTitle(mode, from, to);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    formData.set("mode", mode);
    formData.set("timezone", timezone);
    formData.set("title", effectiveTitle);
    startTransition(async () => {
      setState(await createTransportEvent({ status: "idle" }, formData));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mode">Type de transport</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as TransportMode)}>
            <SelectTrigger id="mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {TRANSPORT_MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="carrier">Transporteur (optionnel)</Label>
          <Input id="carrier" name="carrier" placeholder="Air France, SNCF…" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="from">Départ</Label>
          <Input
            id="from"
            name="from"
            placeholder="Paris CDG"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="to">Arrivée</Label>
          <Input
            id="to"
            name="to"
            placeholder="Maurice SSR"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={effectiveTitle}
          onChange={(e) => {
            setTitleTouched(true);
            setTitle(e.target.value);
          }}
          placeholder="Avion Paris CDG → Maurice SSR"
        />
        <p className="text-xs text-encre-douce">Suggéré automatiquement, modifiable.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">Départ (heure locale)</Label>
          <Input id="startsAtLocal" name="startsAtLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsAtLocal">Arrivée (heure locale, optionnel)</Label>
          <Input id="endsAtLocal" name="endsAtLocal" type="datetime-local" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuseau horaire des heures saisies</Label>
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
          <Label htmlFor="bookingReference">N° de réservation (optionnel)</Label>
          <Input id="bookingReference" name="bookingReference" placeholder="ABC123" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Input id="notes" name="notes" placeholder="Terminal 2E, siège 12A…" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="externalUrl">Lien compagnie (optionnel)</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          placeholder="https://… (statut du vol, appli de la compagnie)"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Phil consigne le trajet…" : "Ajouter le transport"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
