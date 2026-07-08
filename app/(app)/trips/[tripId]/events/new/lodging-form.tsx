"use client";

import { useState, useTransition } from "react";
import { PlaceInput } from "@/components/geo/place-input";
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
  const t = useT();
  const [platform, setPlatform] = useState<LodgingPlatform>("booking");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, setState] = useState<CreateEventState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

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
        <Label htmlFor="name">{t("events.lodging.name")}</Label>
        <PlaceInput
          id="name"
          name="name"
          placeholder={t("events.lodging.namePlaceholder")}
          maxLength={150}
          onSelectAddress={setAddress}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">{t("events.lodging.addressOptional")}</Label>
        <Input
          id="address"
          name="address"
          placeholder={t("events.lodging.addressPlaceholder")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkInLocal">{t("events.form.checkIn")}</Label>
          <Input id="checkInLocal" name="checkInLocal" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="checkOutLocal">{t("events.form.checkOut")}</Label>
          <Input id="checkOutLocal" name="checkOutLocal" type="datetime-local" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("events.form.timezone")}</Label>
        <TimezoneSelect id="timezone" value={timezone} onValueChange={setTimezone} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform">{t("events.lodging.platform")}</Label>
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
          <Label htmlFor="guests">{t("events.lodging.guests")}</Label>
          <Input
            id="guests"
            name="guests"
            type="number"
            min={1}
            max={50}
            placeholder={t("events.lodging.guestsPlaceholder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookingReference">{t("events.form.bookingRefOptional")}</Label>
          <Input
            id="bookingReference"
            name="bookingReference"
            placeholder={t("events.lodging.bookingPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">{t("events.form.notesOptional")}</Label>
          <Input id="notes" name="notes" placeholder={t("events.lodging.notesPlaceholder")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="externalUrl">{t("events.lodging.externalUrl")}</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          placeholder={t("events.lodging.externalUrlPlaceholder")}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("events.lodging.submitting") : t("events.lodging.submit")}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
