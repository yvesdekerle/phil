import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatInTimezone } from "@/lib/events/datetime";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./edit-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ tripId: string; eventId: string }>;
}) {
  const { tripId, eventId } = await params;
  const t = await getT();
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
        className="text-sm text-slate underline underline-offset-4 hover:text-ink"
      >
        {t("events.backToEvent")}
      </Link>
      <h1 className="text-center text-title text-ink">{t("events.edit.title")}</h1>
      <p className="text-center text-xs text-slate">{t("events.edit.hint")}</p>
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
              externalUrl: String(
                (event.metadata as Record<string, unknown> | null)?.external_url ?? "",
              ),
              notes: event.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
