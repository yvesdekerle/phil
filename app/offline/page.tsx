"use client";

import { useEffect, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import type { TripIdea } from "@/lib/ideas/types";
import { type OfflineDocumentMeta, offlineDb, type SyncMeta } from "@/lib/offline/db";
import { openOfflineDocument } from "@/lib/offline/documents";
import { formatDateRange } from "@/lib/trips/format";
import type { Trip } from "@/lib/trips/status";

type OfflineTrip = {
  trip: Trip;
  events: TripEvent[];
  documents: OfflineDocumentMeta[];
  ideas: TripIdea[];
  meta: SyncMeta | undefined;
};

/**
 * Vue de secours 100 % locale (PHIL-I05) : rendue depuis IndexedDB,
 * précachée par le service worker, servie en fallback hors ligne.
 */
export default function OfflinePage() {
  const [trips, setTrips] = useState<OfflineTrip[] | null>(null);
  const [offlineDocIds, setOfflineDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const blobIds = await offlineDb.document_blobs.toCollection().primaryKeys();
      setOfflineDocIds(new Set(blobIds as string[]));
      const allTrips = await offlineDb.trips.toArray();
      const loaded = await Promise.all(
        allTrips.map(async (trip) => ({
          trip,
          events: await offlineDb.events.where("trip_id").equals(trip.id).toArray(),
          documents: await offlineDb.documents_meta.where("trip_id").equals(trip.id).toArray(),
          ideas: await offlineDb.ideas.where("trip_id").equals(trip.id).toArray(),
          meta: await offlineDb.sync_meta.get(`trip:${trip.id}`),
        })),
      );
      setTrips(loaded.sort((a, b) => a.trip.start_date.localeCompare(b.trip.start_date)));
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">Carnet hors ligne</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">
        Ce que Phil a rangé dans la malle avant de perdre le réseau.
      </p>

      {trips === null ? (
        <p className="text-sm text-encre-douce">Ouverture de la malle…</p>
      ) : trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">La malle est vide</p>
          <p className="mt-2 text-sm text-encre-douce">
            Ouvre tes voyages quand tu as du réseau, ou utilise « Préparer pour offline » dans les
            paramètres d'un voyage.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {trips.map(({ trip, events, documents, ideas, meta }) => (
            <section
              key={trip.id}
              className="rounded-lg border border-laiton-clair bg-papier px-5 py-4"
            >
              <h2 className="font-display text-2xl text-encre">{trip.name}</h2>
              <p className="text-sm text-encre-douce">
                {trip.destination} · {formatDateRange(trip.start_date, trip.end_date)}
              </p>
              {meta ? (
                <p className="mt-0.5 text-xs text-encre-douce">
                  Synchronisé le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(meta.syncedAt))}
                </p>
              ) : null}

              {events.length > 0 ? (
                <div className="mt-4 flex flex-col gap-4">
                  {groupEventsByDay(events).map((day) => (
                    <div key={day.dayKey}>
                      <h3 className="mb-1.5 text-xs font-medium text-encre-douce capitalize">
                        {day.label}
                      </h3>
                      <ul className="flex flex-col gap-1.5">
                        {day.events.map((event) => (
                          <li
                            key={event.id}
                            className="flex items-center gap-3 rounded-md border border-laiton-clair/60 bg-parchemin/50 px-3 py-2"
                          >
                            <span className="w-12 shrink-0 text-sm font-medium text-encre tabular-nums">
                              {eventTime(event.starts_at, event.timezone)}
                            </span>
                            <EventTypeIcon type={event.type} className="size-7" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-encre">
                                {event.title}
                              </span>
                              {event.location_name ? (
                                <span className="block truncate text-xs text-encre-douce">
                                  {event.location_name}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {documents.length > 0 ? (
                <div className="mt-4">
                  <h3 className="mb-1.5 text-xs font-medium text-encre-douce">Documents</h3>
                  <ul className="flex flex-col gap-1 text-sm text-encre">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">
                          {doc.file_name}{" "}
                          <span className="text-xs text-encre-douce">— {doc.owner_name}</span>
                        </span>
                        {offlineDocIds.has(doc.id) ? (
                          <button
                            type="button"
                            onClick={() => void openOfflineDocument(doc.id)}
                            className="shrink-0 rounded-full border border-laiton-clair px-2.5 py-0.5 text-xs font-medium text-encre transition-colors hover:bg-parchemin"
                          >
                            Ouvrir (offline)
                          </button>
                        ) : (
                          <span className="shrink-0 text-xs text-encre-douce">non téléchargé</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {ideas.length > 0 ? (
                <div className="mt-4">
                  <h3 className="mb-1.5 text-xs font-medium text-encre-douce">Idées</h3>
                  <ul className="flex flex-col gap-1 text-sm text-encre">
                    {ideas.map((idea) => (
                      <li key={idea.id} className="truncate">
                        {idea.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
