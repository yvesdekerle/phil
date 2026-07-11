"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Switch } from "@/components/ui/switch";
import { type NotificationPreferences, PREFERENCE_LABELS } from "@/lib/notifications/preferences";
import { updateNotificationPreferences } from "./actions";

/** Interrupteurs de notification (PHIL-K04). */
export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const t = useT();
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationPreferences(next);
      if (result.status === "error") {
        setPrefs(prefs);
        setError(result.message ?? t("profile.prefs.saveFailed"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(PREFERENCE_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
        <label
          key={key}
          htmlFor={`pref-${key}`}
          className="flex cursor-pointer items-center justify-between gap-4"
        >
          <span className="text-sm text-ink">{t(PREFERENCE_LABELS[key])}</span>
          <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(v) => toggle(key, v)} />
        </label>
      ))}
      {error ? <p className="text-caption text-berry-ink">{error}</p> : null}
    </div>
  );
}
