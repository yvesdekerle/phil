"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { type ProfileFormState, updateProfile } from "./actions";

type FormValues = {
  displayName: string;
  locale: "fr" | "en" | "es";
  timezone: string;
  whatsapp: string;
};

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
] as const;

export function ProfileForm({ defaultValues }: { defaultValues: FormValues }) {
  const t = useT();
  const [state, setState] = useState<ProfileFormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const formSchema = useMemo(
    () =>
      z.object({
        displayName: z
          .string()
          .trim()
          .min(1, t("profile.form.nameRequired"))
          .max(80, t("profile.form.nameMax")),
        locale: z.enum(["fr", "en", "es"]),
        timezone: z.string().min(1),
        whatsapp: z
          .string()
          .trim()
          .max(50, t("profile.form.whatsappMax"))
          .regex(/^$|^\+?[\d\s.\-()]{6,20}$|^@?[\w.]{3,32}$/, t("profile.form.whatsappInvalid")),
      }),
    [t],
  );

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
    formData.set("displayName", values.displayName);
    formData.set("locale", values.locale);
    formData.set("timezone", values.timezone);
    formData.set("whatsapp", values.whatsapp);
    startTransition(async () => {
      setState(await updateProfile({ status: "idle" }, formData));
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">{t("profile.form.displayName")}</Label>
        <Input id="displayName" autoComplete="name" {...register("displayName")} />
        {errors.displayName ? (
          <p className="text-caption text-berry-ink">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locale">{t("profile.form.language")}</Label>
        <Select
          value={watch("locale")}
          onValueChange={(v) => setValue("locale", v as FormValues["locale"])}
        >
          <SelectTrigger id="locale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">{t("profile.form.defaultTimezone")}</Label>
        <TimezoneSelect
          id="timezone"
          value={watch("timezone")}
          onValueChange={(v) => setValue("timezone", v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp">{t("profile.form.whatsapp")}</Label>
        <Input
          id="whatsapp"
          placeholder={t("profile.form.whatsappPlaceholder")}
          autoComplete="tel"
          {...register("whatsapp")}
        />
        <p className="text-xs text-slate">{t("profile.form.whatsappHint")}</p>
        {errors.whatsapp ? (
          <p className="text-caption text-berry-ink">{errors.whatsapp.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("profile.form.saving") : t("profile.form.save")}
        </Button>
        {state.status === "success" ? <p className="text-sm text-slate">{state.message}</p> : null}
        {state.status === "error" ? (
          <p className="text-caption text-berry-ink">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
