"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { deleteTrip, setTripArchived, type TripSettingsState, updateTrip } from "./actions";

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
    whatsappGroupUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url("URL invalide.")
          .startsWith("https://chat.whatsapp.com/", "Un lien d'invitation chat.whatsapp.com."),
      ])
      .optional(),
    timezone: z.string().min(1),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "Le retour ne peut pas précéder le départ.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

type Props = {
  tripId: string;
  tripName: string;
  isOwner: boolean;
  isArchived: boolean;
  canEdit: boolean;
  defaultValues: FormValues;
};

export function TripSettingsForm({
  tripId,
  tripName,
  isOwner,
  isArchived,
  canEdit,
  defaultValues,
}: Props) {
  const [state, setState] = useState<TripSettingsState>({ status: "idle" });
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
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("tripId", tripId);
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    startTransition(async () => {
      setState(await updateTrip({ status: "idle" }, formData));
    });
  });

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nom du voyage</Label>
          <Input id="name" disabled={!canEdit} {...register("name")} />
          {errors.name ? <p className="text-sm text-bordeaux">{errors.name.message}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="destination">Destination</Label>
          <Input id="destination" disabled={!canEdit} {...register("destination")} />
          {errors.destination ? (
            <p className="text-sm text-bordeaux">{errors.destination.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startDate">Départ</Label>
            <Input id="startDate" type="date" disabled={!canEdit} {...register("startDate")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endDate">Retour</Label>
            <Input id="endDate" type="date" disabled={!canEdit} {...register("endDate")} />
            {errors.endDate ? (
              <p className="text-sm text-bordeaux">{errors.endDate.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="coverImageUrl">Image de couverture (URL)</Label>
          <Input id="coverImageUrl" type="url" disabled={!canEdit} {...register("coverImageUrl")} />
          {errors.coverImageUrl ? (
            <p className="text-sm text-bordeaux">{errors.coverImageUrl.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsappGroupUrl">Groupe WhatsApp du voyage (lien d'invitation)</Label>
          <Input
            id="whatsappGroupUrl"
            type="url"
            placeholder="https://chat.whatsapp.com/…"
            disabled={!canEdit}
            {...register("whatsappGroupUrl")}
          />
          {errors.whatsappGroupUrl ? (
            <p className="text-sm text-bordeaux">{errors.whatsappGroupUrl.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Fuseau horaire par défaut</Label>
          <Select
            value={watch("timezone")}
            onValueChange={(v) => setValue("timezone", v)}
            disabled={!canEdit}
          >
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

        {canEdit ? (
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {state.status !== "idle" ? (
              <p
                className={
                  state.status === "error" ? "text-sm text-bordeaux" : "text-sm text-encre-douce"
                }
              >
                {state.message}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-encre-douce">
            En tant que lecteur, tu peux consulter mais pas modifier ce voyage.
          </p>
        )}
      </form>

      {isOwner ? (
        <div className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
          <p className="text-sm font-medium text-encre">Zone du capitaine</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setState(await setTripArchived(tripId, !isArchived));
                })
              }
            >
              {isArchived ? "Désarchiver" : "Archiver"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={pending}>
                  Supprimer le voyage
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer « {tripName} » ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tout part avec : participants, et bientôt événements, idées et documents du
                    voyage. Cette action est définitive — même Phil ne pourra pas revenir en
                    arrière.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Garder le voyage</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      startTransition(async () => {
                        setState(await deleteTrip(tripId));
                      })
                    }
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-encre-douce">
            Archiver masque le voyage sans rien effacer. Supprimer efface tout.
          </p>
        </div>
      ) : null}
    </div>
  );
}
