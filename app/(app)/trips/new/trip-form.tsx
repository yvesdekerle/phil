"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  const [state, setState] = useState<CreateTripState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

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
        <Label>Point de départ</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemplate("")}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
              template === ""
                ? "border-bordeaux bg-bordeaux/5"
                : "border-laiton-clair bg-papier hover:bg-parchemin",
            )}
          >
            <span className="block font-medium text-encre">Vierge</span>
            <span className="text-xs text-encre-douce">Carnet blanc, tout à écrire.</span>
          </button>
          {TRIP_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplate(t.key)}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                template === t.key
                  ? "border-bordeaux bg-bordeaux/5"
                  : "border-laiton-clair bg-papier hover:bg-parchemin",
              )}
            >
              <span className="block font-medium text-encre">{t.name}</span>
              <span className="text-xs text-encre-douce">{t.description}</span>
            </button>
          ))}
        </div>
        {template ? (
          <p className="text-xs text-encre-douce">
            {TRIP_TEMPLATES.find((t) => t.key === template)?.ideas.length} idées seront pré-remplies
            dans le carnet d'envies.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom du voyage</Label>
        <Input id="name" placeholder="Tour du monde, ou presque" {...register("name")} />
        {errors.name ? <p className="text-sm text-bordeaux">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="destination">Destination</Label>
        <Input id="destination" placeholder="Île Maurice" {...register("destination")} />
        {errors.destination ? (
          <p className="text-sm text-bordeaux">{errors.destination.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Départ</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate ? (
            <p className="text-sm text-bordeaux">{errors.startDate.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">Retour</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate ? (
            <p className="text-sm text-bordeaux">{errors.endDate.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="coverImageUrl">Image de couverture (URL, optionnel)</Label>
        <Input
          id="coverImageUrl"
          type="url"
          placeholder="https://…"
          {...register("coverImageUrl")}
        />
        {errors.coverImageUrl ? (
          <p className="text-sm text-bordeaux">{errors.coverImageUrl.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuseau horaire de la destination</Label>
        <Select value={watch("timezone")} onValueChange={(v) => setValue("timezone", v)}>
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
        <p className="text-xs text-encre-douce">
          Les horaires des événements du voyage s'afficheront dans ce fuseau par défaut.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Phil prépare les malles…" : "Créer le voyage"}
        </Button>
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
