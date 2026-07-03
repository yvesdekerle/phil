import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { eventDayKey } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { EVENT_TYPE_LABELS } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const DAY_WIDTH = 84; // px par jour
const LANES = ["TRANSPORT", "LODGING", "ACTIVITY"] as const;

/** Vue timeline (PHIL-F03) : Gantt horizontal du voyage entier. */
export default async function TimelinePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: trip }, { data: events }] = await Promise.all([
    supabase.from("trips").select("start_date, end_date").eq("id", tripId).single(),
    supabase.from("trip_events").select("*").eq("trip_id", tripId).order("starts_at"),
  ]);
  if (!trip) {
    notFound();
  }

  // L'axe couvre le voyage, élargi aux événements qui débordent (vol aller…)
  let axisStart = parseISO(trip.start_date);
  let axisEnd = parseISO(trip.end_date);
  for (const e of events ?? []) {
    const s = parseISO(eventDayKey(e.starts_at, e.timezone));
    const f = parseISO(eventDayKey(e.ends_at ?? e.starts_at, e.timezone));
    if (s < axisStart) {
      axisStart = s;
    }
    if (f > axisEnd) {
      axisEnd = f;
    }
  }
  const dayCount = differenceInCalendarDays(axisEnd, axisStart) + 1;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(axisStart, i));

  const bars = ((events ?? []) as TripEvent[]).map((event) => {
    const startIdx = differenceInCalendarDays(
      parseISO(eventDayKey(event.starts_at, event.timezone)),
      axisStart,
    );
    const endIdx = differenceInCalendarDays(
      parseISO(eventDayKey(event.ends_at ?? event.starts_at, event.timezone)),
      axisStart,
    );
    return { event, startIdx, span: Math.max(1, endIdx - startIdx + 1) };
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/trips/${tripId}`}
          className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          ← Retour au calendrier
        </Link>
        <h1 className="font-display text-2xl text-encre">Timeline</h1>
      </div>

      {bars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Rien à dérouler</p>
          <p className="mt-2 text-sm text-encre-douce">
            Ajoute des événements au calendrier : la frise se dessinera toute seule.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-laiton-clair bg-papier pb-3">
          <div style={{ width: dayCount * DAY_WIDTH + 130 }}>
            {/* En-tête des jours */}
            <div className="flex border-b border-laiton-clair/60">
              <div className="w-[130px] shrink-0" />
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="shrink-0 border-l border-laiton-clair/30 px-2 py-2 text-center"
                  style={{ width: DAY_WIDTH }}
                >
                  <p className="text-[0.65rem] text-encre-douce uppercase">
                    {format(d, "EEE", { locale: fr })}
                  </p>
                  <p className="text-sm font-medium text-encre">
                    {format(d, "d MMM", { locale: fr })}
                  </p>
                </div>
              ))}
            </div>

            {/* Une section par type, une ligne par événement */}
            {LANES.map((lane) => {
              const laneBars = bars.filter((b) => b.event.type === lane);
              if (laneBars.length === 0) {
                return null;
              }
              return (
                <div key={lane} className="border-b border-laiton-clair/40 last:border-b-0">
                  <p className="px-3 pt-2.5 pb-1 text-[0.65rem] font-medium tracking-wide text-laiton uppercase">
                    {EVENT_TYPE_LABELS[lane]}
                  </p>
                  {laneBars.map(({ event, startIdx, span }) => (
                    <div key={event.id} className="flex items-center py-0.5">
                      <div className="w-[130px] shrink-0 truncate px-3 text-xs text-encre-douce">
                        {event.title}
                      </div>
                      <div className="relative h-8" style={{ width: dayCount * DAY_WIDTH }}>
                        <Link
                          href={`/trips/${tripId}/events/${event.id}`}
                          className={cn(
                            "absolute top-0.5 bottom-0.5 flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 transition-shadow hover:shadow-[0_2px_10px_rgba(31,42,68,0.2)]",
                            event.type === "TRANSPORT" && "border-encre/40 bg-encre/10",
                            event.type === "LODGING" && "border-laiton bg-laiton/20",
                            event.type === "ACTIVITY" && "border-bordeaux/40 bg-bordeaux/10",
                          )}
                          style={{ left: startIdx * DAY_WIDTH + 2, width: span * DAY_WIDTH - 4 }}
                        >
                          <EventTypeIcon type={event.type} className="size-5 shrink-0" />
                          <span className="truncate text-xs font-medium text-encre">
                            {event.title}
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
