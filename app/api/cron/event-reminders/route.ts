import { eventDayKey, eventTime } from "@/lib/events/datetime";
import { ensureTripCoords } from "@/lib/geo/locate";
import { sendPushToUser } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyForecast, isRainy, weatherLabel } from "@/lib/weather/open-meteo";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien 16h UTC (slot 2 — les 2 slots Hobby sont pris) :
 * 1. Rappels J-1 en push (PHIL-N08) — événements qui démarrent demain
 *    (fenêtre UTC 24-48 h, approximation documentée) : inscrits F11 s'il
 *    y en a, sinon tout l'équipage. Préférence `event_reminders`.
 * 2. Alerte météo de la veille (PHIL-O03) — voyages en cours dont la météo
 *    de demain annonce de la pluie : push à l'équipage en fin de journée
 *    (16h UTC = 18h Paris l'été, 20h à Maurice — approximation de fuseau
 *    assumée). Préférence `weather_alerts`.
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

  // PHIL-O03 — alerte météo de la veille pour les voyages en cours
  const todayUtc = new Date().toISOString().slice(0, 10);
  const { data: trips } = await admin
    .from("trips")
    .select("id, name, destination, destination_lat, destination_lng, default_timezone")
    .lte("start_date", todayUtc)
    .gte("end_date", todayUtc);

  let weatherSent = 0;
  for (const trip of trips ?? []) {
    const coords = await ensureTripCoords(admin, trip);
    if (!coords) {
      continue;
    }
    const tomorrowKey = eventDayKey(
      new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      trip.default_timezone,
    );
    const forecast = await getDailyForecast(coords.lat, coords.lng, trip.default_timezone);
    const tomorrow = forecast.find((d) => d.date === tomorrowKey);
    if (!tomorrow || (!isRainy(tomorrow.code) && (tomorrow.precipProb ?? 0) < 60)) {
      continue;
    }

    const { data: members } = await admin
      .from("trip_participants")
      .select("user_id")
      .eq("trip_id", trip.id);
    for (const member of members ?? []) {
      await sendPushToUser(
        member.user_id,
        {
          title: `Demain à ${trip.destination} : ${weatherLabel(tomorrow.code).toLowerCase()}`,
          body: `${tomorrow.tMax}° / ${tomorrow.tMin}°${tomorrow.precipProb !== null ? ` — ${tomorrow.precipProb} % de pluie` : ""}. Pense au plan B !`,
          url: `/trips/${trip.id}/day/${tomorrowKey}`,
        },
        "weather_alerts",
      );
      weatherSent++;
    }
  }

  return Response.json({
    events: (events ?? []).length,
    notifications: sent,
    weatherAlerts: weatherSent,
  });
}
