import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatInTimezone } from "@/lib/events/datetime";
import { LODGING_PLATFORM_LABELS, type LodgingPlatform } from "@/lib/events/lodging";
import { TRANSPORT_MODE_LABELS, type TransportMode } from "@/lib/events/transport";
import { EVENT_TYPE_LABELS } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-encre-douce">{label}</span>
      <span className="text-right text-encre">{value}</span>
    </div>
  );
}

export default async function EventDetailPage({
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

  const [{ data: event }, { data: attachedDocs }] = await Promise.all([
    supabase.from("trip_events").select("*").eq("id", eventId).eq("trip_id", tripId).single(),
    supabase
      .from("event_documents")
      .select("documents(id, file_name, mime_type)")
      .eq("event_id", eventId),
  ]);

  if (!event) {
    notFound();
  }

  const meta = (event.metadata ?? {}) as Record<string, string | number>;
  const documents = (attachedDocs ?? [])
    .map((row) => row.documents)
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const timeFormat = "d MMM, HH'h'mm";
  const start = formatInTimezone(event.starts_at, event.timezone, timeFormat);
  const end = event.ends_at ? formatInTimezone(event.ends_at, event.timezone, timeFormat) : null;

  const mapsQuery =
    event.location_address || event.location_name || (meta.to ? String(meta.to) : null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour au calendrier
      </Link>

      <div className="flex items-start gap-4">
        <EventTypeIcon type={event.type} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl text-encre">{event.title}</h1>
          <p className="mt-0.5 text-sm text-encre-douce">{EVENT_TYPE_LABELS[event.type]}</p>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-laiton-clair/50">
          <Row
            label={event.type === "LODGING" ? "Check-in" : "Début"}
            value={`${start} (heure locale ${event.timezone})`}
          />
          {end ? <Row label={event.type === "LODGING" ? "Check-out" : "Fin"} value={end} /> : null}

          {event.type === "TRANSPORT" && meta.transport_mode ? (
            <Row
              label="Mode"
              value={
                TRANSPORT_MODE_LABELS[meta.transport_mode as TransportMode] ?? meta.transport_mode
              }
            />
          ) : null}
          {meta.from && meta.to ? <Row label="Trajet" value={`${meta.from} → ${meta.to}`} /> : null}
          {meta.carrier ? <Row label="Transporteur" value={meta.carrier} /> : null}
          {event.type === "LODGING" && meta.platform ? (
            <Row
              label="Plateforme"
              value={LODGING_PLATFORM_LABELS[meta.platform as LodgingPlatform] ?? meta.platform}
            />
          ) : null}
          {meta.guests ? <Row label="Voyageurs" value={meta.guests} /> : null}
          {meta.booking_reference ? (
            <Row label="Réservation" value={meta.booking_reference} />
          ) : null}
          {meta.duration_minutes ? (
            <Row label="Durée estimée" value={`${meta.duration_minutes} min`} />
          ) : null}
          {meta.cost ? (
            <Row label="Coût" value={`${meta.cost} ${meta.cost_currency ?? ""}`} />
          ) : null}
          {event.location_name ? <Row label="Lieu" value={event.location_name} /> : null}
          {event.location_address ? <Row label="Adresse" value={event.location_address} /> : null}
          {event.notes ? <Row label="Notes" value={event.notes} /> : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {mapsQuery ? (
          <Button asChild variant="outline">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin aria-hidden="true" /> Itinéraire
            </a>
          </Button>
        ) : null}
        {meta.external_url ? (
          <Button asChild variant="outline">
            <a href={String(meta.external_url)} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" /> Lien externe
            </a>
          </Button>
        ) : null}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-encre-douce">Documents attachés</h2>
        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
            Aucun document attaché — le picker arrive avec PHIL-F10.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/documents/${doc.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-laiton-clair bg-papier px-4 py-3 text-sm font-medium text-encre transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.1)]"
                >
                  {doc.file_name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
