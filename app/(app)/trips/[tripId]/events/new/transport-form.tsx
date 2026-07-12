"use client";

import { useActionState, useState } from "react";
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
import { TimezoneSelect } from "@/components/ui/timezone-select";
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
  const t = useT();
  const [mode, setMode] = useState<TransportMode>("plane");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, formAction, pending] = useActionState<CreateEventState, FormData>(
    createTransportEvent,
    { status: "idle" },
  );

  const effectiveTitle = titleTouched ? title : suggestTransportTitle(mode, from, to);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="title" value={effectiveTitle} />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mode">{t("events.transport.mode")}</Label>
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
          <Label htmlFor="carrier">{t("events.transport.carrier")}</Label>
          <Input
            id="carrier"
            name="carrier"
            placeholder={t("events.transport.carrierPlaceholder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="from">{t("events.form.from")}</Label>
          <Input
            id="from"
            name="from"
            placeholder={t("events.transport.fromPlaceholder")}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="to">{t("events.form.to")}</Label>
          <Input
            id="to"
            name="to"
            placeholder={t("events.transport.toPlaceholder")}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("events.form.title")}</Label>
        <Input
          id="title"
          value={effectiveTitle}
          onChange={(e) => {
            setTitleTouched(true);
            setTitle(e.target.value);
          }}
          placeholder={t("events.transport.titlePlaceholder")}
        />
        <p className="text-xs text-slate">{t("events.transport.titleHint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">{t("events.transport.startLocal")}</Label>
          <Input id="startsAtLocal" name="startsAtLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsAtLocal">{t("events.transport.endLocal")}</Label>
          <Input id="endsAtLocal" name="endsAtLocal" type="datetime-local" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("events.form.timezoneEntered")}</Label>
        <TimezoneSelect id="timezone" value={timezone} onValueChange={setTimezone} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookingReference">{t("events.form.bookingRefOptional")}</Label>
          <Input
            id="bookingReference"
            name="bookingReference"
            placeholder={t("events.transport.bookingPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">{t("events.form.notesOptional")}</Label>
          <Input id="notes" name="notes" placeholder={t("events.transport.notesPlaceholder")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="externalUrl">{t("events.transport.externalUrl")}</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          placeholder={t("events.transport.externalUrlPlaceholder")}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("events.transport.submitting") : t("events.transport.submit")}
        </Button>
        {state.status === "error" ? (
          <p className="text-caption text-berry-ink">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
