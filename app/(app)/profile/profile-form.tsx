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
import { type ProfileFormState, updateProfile } from "./actions";

const formSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Il faut bien un nom sur le carnet de bord.")
    .max(80, "80 caractères maximum."),
  locale: z.enum(["fr", "en"]),
  timezone: z.string().min(1),
  whatsapp: z
    .string()
    .trim()
    .max(50, "50 caractères maximum.")
    .regex(/^$|^\+?[\d\s.\-()]{6,20}$|^@?[\w.]{3,32}$/, "Un numéro (+33 6…) ou un @pseudo."),
});

type FormValues = z.infer<typeof formSchema>;

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
] as const;

export function ProfileForm({ defaultValues }: { defaultValues: FormValues }) {
  const [state, setState] = useState<ProfileFormState>({ status: "idle" });
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
        <Label htmlFor="displayName">Nom affiché</Label>
        <Input id="displayName" autoComplete="name" {...register("displayName")} />
        {errors.displayName ? (
          <p className="text-sm text-bordeaux">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locale">Langue</Label>
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
        <Label htmlFor="timezone">Fuseau horaire par défaut</Label>
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp">WhatsApp (numéro ou @pseudo)</Label>
        <Input
          id="whatsapp"
          placeholder="+33 6 12 34 56 78 ou @phileas"
          autoComplete="tel"
          {...register("whatsapp")}
        />
        <p className="text-xs text-encre-douce">
          Visible uniquement de tes co-voyageurs, pour te joindre en un tap.
        </p>
        {errors.whatsapp ? (
          <p className="text-sm text-bordeaux">{errors.whatsapp.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state.status === "success" ? (
          <p className="text-sm text-encre-douce">{state.message}</p>
        ) : null}
        {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
      </div>
    </form>
  );
}
