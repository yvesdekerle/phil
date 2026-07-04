import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePreferences } from "./preferences";

/**
 * Envoi Web Push (PHIL-N07) — service role, best effort.
 * `prefKey` : la préférence K04/N07 qui autorise ce type de notification.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
  prefKey?:
    | "invitations"
    | "expiry_alerts"
    | "event_reminders"
    | "weather_alerts"
    | "empty_day_reminders",
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return;
  }
  webpush.setVapidDetails("mailto:yves.dekerle@gmail.com", publicKey, privateKey);

  const admin = createAdminClient();

  if (prefKey) {
    const { data: profile } = await admin
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();
    if (!parsePreferences(profile?.notification_preferences)[prefKey]) {
      return;
    }
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (e) {
        // 404/410 : abonnement mort, on le purge
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
