"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { TRIP_TEMPLATES } from "@/lib/trips/templates";
import { cn } from "@/lib/utils";
import { type CreateTripState, createTrip } from "./actions";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Donne un nom à ce voyage.").max(100),
    destination: z.string().trim().min(1, "Où va-t-on ?").max(100),
    startDate: z.string().min(1, "Date de départ requise."),
    endDate: z.string().min(1, "Date de retour requise."),
    coverImageUrl: z
      .union([
        z.literal(""),
        z.string().url("URL invalide.").startsWith("https://", "URL en https uniquement."),
      ])
      .optional(),
    timezone: z.string().min(1),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "Le retour ne peut pas précéder le départ — même Phileas n'y est pas arrivé.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

export function TripForm({ defaultTimezone }: { defaultTimezone: string }) {
  const t = useT();
  const [state, setState] = useState<CreateTripState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      destination: "",
      startDate: "",
      endDate: "",
      coverImageUrl: "",
      timezone: defaultTimezone,
    },
  });

  const [template, setTemplate] = useState<string>("");

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    formData.set("template", template);
    startTransition(async () => {
      setState(await createTrip({ status: "idle" }, formData));
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* PHIL-N03 : vierge ou template */}
      <div className="flex flex-col gap-2">
        <Label>{t("newTrip.startPoint")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemplate("")}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
              template === ""
                ? "border-lagoon-ink bg-lagoon-ink/5"
                : "border-line bg-card hover:bg-sand",
            )}
          >
            <span className="block font-medium text-ink">{t("newTrip.blank")}</span>
            <span className="text-xs text-slate">{t("newTrip.blankDesc")}</span>
          </button>
          {TRIP_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setTemplate(tpl.key)}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                template === tpl.key
                  ? "border-lagoon-ink bg-lagoon-ink/5"
                  : "border-line bg-card hover:bg-sand",
              )}
            >
              <span className="block font-medium text-ink">{tpl.name}</span>
              <span className="text-xs text-slate">{tpl.description}</span>
            </button>
          ))}
        </div>
        {template ? (
          <p className="text-xs text-slate">
            {t("newTrip.templateHint").replace(
              "{count}",
              String(TRIP_TEMPLATES.find((tpl) => tpl.key === template)?.ideas.length ?? 0),
            )}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("newTrip.name")}</Label>
        <Input id="name" placeholder={t("newTrip.namePlaceholder")} {...register("name")} />
        {errors.name ? <p className="text-sm text-lagoon-ink">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="destination">{t("newTrip.destination")}</Label>
        <Input
          id="destination"
          placeholder={t("newTrip.destinationPlaceholder")}
          {...register("destination")}
        />
        {errors.destination ? (
          <p className="text-sm text-lagoon-ink">{errors.destination.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">{t("newTrip.startDate")}</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate ? (
            <p className="text-sm text-lagoon-ink">{errors.startDate.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">{t("newTrip.endDate")}</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate ? (
            <p className="text-sm text-lagoon-ink">{errors.endDate.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="coverImageUrl">{t("newTrip.coverUrl")}</Label>
        <Input
          id="coverImageUrl"
          type="url"
          placeholder="https://…"
          {...register("coverImageUrl")}
        />
        {errors.coverImageUrl ? (
          <p className="text-sm text-lagoon-ink">{errors.coverImageUrl.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("newTrip.timezone")}</Label>
        <TimezoneSelect
          id="timezone"
          value={watch("timezone")}
          onValueChange={(v) => setValue("timezone", v)}
        />
        <p className="text-xs text-slate">{t("newTrip.timezoneHint")}</p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("newTrip.submitting") : t("newTrip.submit")}
        </Button>
        {state.status === "error" ? (
          <p className="text-sm text-lagoon-ink">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
