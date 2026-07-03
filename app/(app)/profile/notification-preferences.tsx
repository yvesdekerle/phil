"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { type NotificationPreferences, PREFERENCE_LABELS } from "@/lib/notifications/preferences";
import { updateNotificationPreferences } from "./actions";

/** Interrupteurs de notification (PHIL-K04). */
export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
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
        setError(result.message ?? "Enregistrement impossible.");
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
          <span className="text-sm text-encre">{PREFERENCE_LABELS[key]}</span>
          <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(v) => toggle(key, v)} />
        </label>
      ))}
      {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
    </div>
  );
}
