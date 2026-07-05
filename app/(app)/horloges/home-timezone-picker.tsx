"use client";

import { Home } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { setHomeTimezone } from "./actions";

/** Choix de "sa maison" sur la page Horloges (PHIL-Q40). */
export function HomeTimezonePicker({ value }: { value: string }) {
  const t = useT();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const [tz, setTz] = useState(value);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-encre">
      <span className="flex items-center gap-1.5 text-encre-douce">
        <Home className="size-4" aria-hidden="true" /> {t("clocks.home")}
      </span>
      <select
        value={tz}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setTz(next);
          setSaved(false);
          startTransition(async () => {
            await setHomeTimezone(next);
            setSaved(true);
          });
        }}
        className="min-w-0 flex-1 rounded-md border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
      >
        {timezones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="text-xs text-encre-douce">…</span>
      ) : saved ? (
        <span className="text-xs text-[#3f6e5a]">{t("clocks.saved")}</span>
      ) : null}
    </label>
  );
}
