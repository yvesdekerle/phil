import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Flux iCal du voyage (PHIL-N02). URL d'abonnement authentifiée par le
 * jeton personnel du participant (les agendas ne portent pas de session).
 * Horaires en UTC (instant exact — l'agenda affiche dans le fuseau du
 * lecteur), description = notes + lien vers la fiche Phil.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/.test(token) || !/^[0-9a-f-]{36}$/.test(tripId)) {
    return new Response("Jeton requis", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: participant } = await admin
    .from("trip_participants")
    .select("trip_id")
    .eq("calendar_token", token)
    .eq("trip_id", tripId)
    .maybeSingle();
  if (!participant) {
    return new Response("Jeton invalide", { status: 403 });
  }

  const [{ data: trip }, { data: events }] = await Promise.all([
    admin.from("trips").select("name").eq("id", tripId).single(),
    admin.from("trip_events").select("*").eq("trip_id", tripId).order("starts_at"),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Normalise en UTC strict ("Z") quel que soit le format Postgres (+00:00)
  const fmt = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Phil//Carnet de voyage//FR",
    `X-WR-CALNAME:${esc(trip?.name ?? "Voyage Phil")}`,
    "CALSCALE:GREGORIAN",
  ];

  for (const e of events ?? []) {
    const description = [e.notes ?? "", `Fiche Phil : ${baseUrl}/trips/${tripId}/events/${e.id}`]
      .filter(Boolean)
      .join("\\n\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@phil`,
      `DTSTAMP:${fmt(new Date().toISOString())}`,
      `DTSTART:${fmt(e.starts_at)}`,
      ...(e.ends_at ? [`DTEND:${fmt(e.ends_at)}`] : []),
      `SUMMARY:${esc(e.title)}`,
      ...(e.location_name ? [`LOCATION:${esc(e.location_address ?? e.location_name)}`] : []),
      `DESCRIPTION:${description}`,
      `URL:${baseUrl}/trips/${tripId}/events/${e.id}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="phil.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
