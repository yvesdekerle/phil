import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatInTimezone } from "@/lib/events/datetime";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./edit-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ tripId: string; eventId: string }>;
}) {
  const { tripId, eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("trip_events")
    .select("*")
    .eq("id", eventId)
    .eq("trip_id", tripId)
    .single();

  if (!event) {
    notFound();
  }

  const toLocal = (utc: string) => formatInTimezone(utc, event.timezone, "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/events/${eventId}`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour à l'événement
      </Link>
      <h1 className="text-center font-display text-2xl text-encre">Modifier l'événement</h1>
      <p className="text-center text-xs text-encre-douce">
        Les champs spécifiques (n° de réservation, trajet…) ne sont pas encore modifiables ici.
      </p>
      <Card>
        <CardContent>
          <EditEventForm
            tripId={tripId}
            eventId={eventId}
            defaults={{
              title: event.title,
              startsAtLocal: toLocal(event.starts_at),
              endsAtLocal: event.ends_at ? toLocal(event.ends_at) : "",
              timezone: event.timezone,
              locationName: event.location_name ?? "",
              locationAddress: event.location_address ?? "",
              notes: event.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
