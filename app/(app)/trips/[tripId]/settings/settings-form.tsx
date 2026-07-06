"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CurrencyInput } from "@/components/budget/currency-input";
import { useT } from "@/components/i18n/provider";
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
    whatsappGroupUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url("URL invalide.")
          .regex(
            /^https:\/\/(chat\.whatsapp\.com|m\.me|(www\.)?messenger\.com)\//,
            "Un lien WhatsApp (chat.whatsapp.com) ou Messenger (m.me).",
          ),
      ])
      .optional(),
    currencyPrimary: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Code devise à 3 lettres (EUR, MUR…)."),
    currencySecondary: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^$|^[A-Z]{3}$/, "Code devise à 3 lettres, ou vide."),
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
  const t = useT();
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
          <Label htmlFor="name">{t("settings.form.name")}</Label>
          <Input id="name" disabled={!canEdit} {...register("name")} />
          {errors.name ? <p className="text-sm text-bordeaux">{errors.name.message}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="destination">{t("settings.form.destination")}</Label>
          <Input id="destination" disabled={!canEdit} {...register("destination")} />
          {errors.destination ? (
            <p className="text-sm text-bordeaux">{errors.destination.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startDate">{t("settings.form.startDate")}</Label>
            <Input id="startDate" type="date" disabled={!canEdit} {...register("startDate")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endDate">{t("settings.form.endDate")}</Label>
            <Input id="endDate" type="date" disabled={!canEdit} {...register("endDate")} />
            {errors.endDate ? (
              <p className="text-sm text-bordeaux">{errors.endDate.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currencyPrimary">{t("settings.form.currencyPrimary")}</Label>
            <CurrencyInput
              id="currencyPrimary"
              placeholder="EUR"
              disabled={!canEdit}
              {...register("currencyPrimary")}
            />
            {errors.currencyPrimary ? (
              <p className="text-sm text-bordeaux">{errors.currencyPrimary.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="currencySecondary">{t("settings.form.currencySecondary")}</Label>
            <CurrencyInput
              id="currencySecondary"
              placeholder="MUR"
              disabled={!canEdit}
              {...register("currencySecondary")}
            />
            {errors.currencySecondary ? (
              <p className="text-sm text-bordeaux">{errors.currencySecondary.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsappGroupUrl">{t("settings.form.groupChat")}</Label>
          <Input
            id="whatsappGroupUrl"
            type="url"
            placeholder={t("settings.form.groupChatPlaceholder")}
            disabled={!canEdit}
            {...register("whatsappGroupUrl")}
          />
          {errors.whatsappGroupUrl ? (
            <p className="text-sm text-bordeaux">{errors.whatsappGroupUrl.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">{t("settings.form.timezone")}</Label>
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
              {pending ? t("settings.form.saving") : t("settings.form.save")}
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
          <p className="text-sm text-encre-douce">{t("settings.form.viewerNote")}</p>
        )}
      </form>

      {isOwner ? (
        <div className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
          <p className="text-sm font-medium text-encre">{t("settings.danger.title")}</p>
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
              {isArchived ? t("settings.danger.unarchive") : t("settings.danger.archive")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={pending}>
                  {t("settings.danger.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.danger.deleteTitle").replace("{name}", tripName)}
                  </AlertDialogTitle>
                  <AlertDialogDescription>{t("settings.danger.deleteDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("settings.danger.keep")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      startTransition(async () => {
                        setState(await deleteTrip(tripId));
                      })
                    }
                  >
                    {t("settings.danger.deleteConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-encre-douce">{t("settings.danger.note")}</p>
        </div>
      ) : null}
    </div>
  );
}
