"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Sélecteur de fuseau horaire IANA partagé (PHIL-R20). Factorise le duo
 * `Intl.supportedValuesOf("timeZone")` + `<Select>` dupliqué dans tous les
 * formulaires (profil, voyage, événements). Contrôlé : marche aussi bien avec
 * react-hook-form (`watch`/`setValue`) qu'avec un simple `useState`.
 */
export function TimezoneSelect({
  id,
  value,
  onValueChange,
  className = "w-full",
  disabled,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
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
  );
}
