import { z } from "zod";

/** Préférences de notification (PHIL-K04), stockées en JSONB sur profiles. */
export const notificationPreferencesSchema = z.object({
  invitations: z.boolean(),
  expiry_alerts: z.boolean(),
  event_reminders: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  invitations: true,
  expiry_alerts: true,
  event_reminders: true,
};

export const PREFERENCE_LABELS: Record<keyof NotificationPreferences, string> = {
  invitations: "Invitations à un voyage",
  expiry_alerts: "Alertes d'expiration de documents",
  event_reminders: "Rappels d'événements (J-1)",
};

/** Parse tolérant : valeurs inconnues → défauts. */
export function parsePreferences(raw: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}
