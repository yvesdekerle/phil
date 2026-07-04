import { eventTime } from "@/lib/events/datetime";
import { sendPushToUser } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Rappels J-1 en push (PHIL-N08) — cron quotidien 16h UTC (slot 2).
 * Notifie les événements qui démarrent demain (fenêtre UTC 24-48 h,
 * approximation documentée) : inscrits F11 s'il y en a, sinon tout
 * l'équipage. Respecte la préférence `event_reminders` (K04/N07).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const from = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const to = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const { data: events } = await admin
    .from("trip_events")
    .select("id, trip_id, title, starts_at, timezone, location_name")
    .gte("starts_at", from)
    .lt("starts_at", to);

  let sent = 0;
  for (const event of events ?? []) {
    const { data: signedUp } = await admin
      .from("event_participants")
      .select("user_id")
      .eq("event_id", event.id);
    let recipients = (signedUp ?? []).map((s) => s.user_id);
    if (recipients.length === 0) {
      const { data: members } = await admin
        .from("trip_participants")
        .select("user_id")
        .eq("trip_id", event.trip_id);
      recipients = (members ?? []).map((m) => m.user_id);
    }

    const time = eventTime(event.starts_at, event.timezone);
    for (const userId of recipients) {
      await sendPushToUser(
        userId,
        {
          title: `Demain : ${event.title}`,
          body: `${time}${event.location_name ? ` — ${event.location_name}` : ""}`,
          url: `/trips/${event.trip_id}/events/${event.id}`,
        },
        "event_reminders",
      );
      sent++;
    }
  }

  return Response.json({ events: (events ?? []).length, notifications: sent });
}
