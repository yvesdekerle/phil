import Link from "next/link";
import { redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { Button } from "@/components/ui/button";
import { eventDayKey, eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function TripCalendarPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: eventsData }, { data: me }, { data: trip }] = await Promise.all([
    supabase
      .from("trip_events")
      .select("*")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("trips").select("default_timezone").eq("id", tripId).single(),
  ]);

  const events = (eventsData ?? []) as TripEvent[];
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";
  const days = groupEventsByDay(events);
  // "Aujourd'hui" dans le fuseau du voyage
  const todayKey = trip ? eventDayKey(new Date().toISOString(), trip.default_timezone) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-3">
        <Button asChild variant="outline">
          <Link href={`/trips/${tripId}/timeline`}>Timeline</Link>
        </Button>
        {canEdit ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/events/new`}>Ajouter un événement</Link>
          </Button>
        ) : null}
      </div>

      {days.length > 0 ? (
        <p className="-mb-3 text-right text-xs text-encre-douce">
          Heures affichées en heure locale de chaque événement.
        </p>
      ) : null}

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Aucun événement pour l'instant</p>
          <p className="max-w-sm text-sm text-encre-douce">
            Même Phileas prenait des pauses — mais un vol, un hôtel ou une plongée, ça se note.
          </p>
          {canEdit ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/events/new`}>Ajouter un événement</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.dayKey}>
              <h2
                className={cn(
                  "mb-2 flex items-center gap-2 text-sm font-medium capitalize",
                  day.dayKey === todayKey ? "text-bordeaux" : "text-encre-douce",
                )}
              >
                <Link
                  href={`/trips/${tripId}/day/${day.dayKey}`}
                  className="underline-offset-4 hover:underline"
                  title="Voir la journée heure par heure"
                >
                  {day.label}
                </Link>
                {day.dayKey === todayKey ? (
                  <span className="rounded-full bg-bordeaux px-2 py-0.5 text-[0.65rem] font-medium text-papier uppercase">
                    Aujourd'hui
                  </span>
                ) : null}
              </h2>
              <ul className="flex flex-col gap-2">
                {day.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/trips/${tripId}/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
                    >
                      <span className="w-14 shrink-0 text-sm font-medium text-encre tabular-nums">
                        {eventTime(event.starts_at, event.timezone)}
                      </span>
                      <EventTypeIcon type={event.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-encre">
                          {event.title}
                        </span>
                        {event.location_name ? (
                          <span className="block truncate text-xs text-encre-douce">
                            {event.location_name}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
