import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import { eventDayKey } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const DAY_WIDTH = 155; // px par jour (PHIL-Q37c : plus large pour lire les libellés)
const LABEL_W = 220; // px de la colonne fixe des noms
const LANES = ["TRANSPORT", "LODGING", "ACTIVITY"] as const;

/** Vue timeline (PHIL-F03) : Gantt horizontal du voyage entier. */
export default async function TimelinePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
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

  // Fond en colonnes : un léger séparateur vertical à chaque jour (PHIL-Q36)
  const dayGridBackground = {
    backgroundImage:
      "repeating-linear-gradient(to right, rgba(176,141,63,0.16) 0, rgba(176,141,63,0.16) 1px, transparent 1px, transparent " +
      `${DAY_WIDTH}px)`,
    backgroundPosition: `${LABEL_W}px 0`,
  } as const;

  return (
    // Pleine largeur (PHIL-Q37c) : le Gantt déborde du gabarit pour lire les titres
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[104rem] pb-16">
        {/* Le toggle indique déjà la vue active — pas de titre « Timeline » redondant (U03). */}
        <div className="mb-4">
          <TripViewToggle tripId={tripId} active="timeline" />
        </div>

        {bars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
            <p className="font-display text-xl text-encre italic">
              {t("calendar.timeline.emptyTitle")}
            </p>
            <p className="mt-2 text-sm text-encre-douce">{t("calendar.timeline.emptyBody")}</p>
          </div>
        ) : (
          <div className="sticky top-16 z-0 max-h-[calc(100dvh-3.5rem)] overflow-auto rounded-lg border border-laiton-clair bg-papier">
            <div style={{ width: dayCount * DAY_WIDTH + LABEL_W }}>
              {/* En-tête des jours — figé en haut, colonne des noms figée à gauche */}
              <div
                className="sticky top-0 z-30 flex border-b border-laiton-clair/60 bg-papier"
                style={dayGridBackground}
              >
                <div className="sticky left-0 z-40 shrink-0 bg-papier" style={{ width: LABEL_W }} />
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="shrink-0 border-l border-laiton-clair/40 px-2 py-2 text-center"
                    style={{ width: DAY_WIDTH }}
                  >
                    <p className="text-[0.65rem] text-encre-douce uppercase">
                      {format(d, "EEE", { locale: dfLocale })}
                    </p>
                    <p className="text-sm font-medium text-encre">
                      {format(d, "d MMM", { locale: dfLocale })}
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
                    <p className="sticky left-0 z-20 bg-papier px-3 pt-2.5 pb-1 text-[0.65rem] font-medium tracking-wide text-laiton uppercase">
                      {t(`events.type.${lane}`)}
                    </p>
                    {laneBars.map(({ event, startIdx, span }) => (
                      <div
                        key={event.id}
                        className="flex items-center py-0.5"
                        style={dayGridBackground}
                      >
                        <div
                          className="sticky left-0 z-20 flex shrink-0 items-center self-stretch border-r border-laiton-clair/40 bg-papier px-3"
                          style={{ width: LABEL_W }}
                          title={event.title}
                        >
                          <span className="truncate text-xs text-encre-douce">{event.title}</span>
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
    </div>
  );
}
