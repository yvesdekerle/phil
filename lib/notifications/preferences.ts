import { z } from "zod";

/** Préférences de notification (PHIL-K04), stockées en JSONB sur profiles. */
export const notificationPreferencesSchema = z.object({
  invitations: z.boolean(),
  expiry_alerts: z.boolean(),
  event_reminders: z.boolean(),
  // .default(true) : les JSONB écrits avant PHIL-O03 n'ont pas cette clé
  weather_alerts: z.boolean().default(true),
  // PHIL-Q18 : rappel de la veille quand le lendemain est vide
  empty_day_reminders: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  invitations: true,
  expiry_alerts: true,
  event_reminders: true,
  weather_alerts: true,
  empty_day_reminders: true,
};

/**
 * Clés i18n des libellés (PHIL-Q37) — traduites à l'affichage via `t()`.
 * L'ordre des clés définit l'ordre des interrupteurs dans l'UI.
 */
export const PREFERENCE_LABELS: Record<keyof NotificationPreferences, string> = {
  invitations: "profile.prefs.invitations",
  expiry_alerts: "profile.prefs.expiryAlerts",
  event_reminders: "profile.prefs.eventReminders",
  weather_alerts: "profile.prefs.weatherAlerts",
  empty_day_reminders: "profile.prefs.emptyDayReminders",
};

/** Parse tolérant : valeurs inconnues → défauts. */
export function parsePreferences(raw: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}
