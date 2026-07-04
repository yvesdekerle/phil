import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { DocumentPicker } from "@/components/documents/document-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Linkify } from "@/components/ui/linkify";
import { formatInTimezone } from "@/lib/events/datetime";
import { LODGING_PLATFORM_LABELS, type LodgingPlatform } from "@/lib/events/lodging";
import { TRANSPORT_MODE_LABELS, type TransportMode } from "@/lib/events/transport";
import { EVENT_TYPE_LABELS } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { attachDocument, detachDocument } from "./actions";
import { EventActions } from "./event-actions";
import { type EventNote, EventNotes } from "./event-notes";
import { EventPacking, type PackingItem } from "./event-packing";
import { EventParticipants } from "./event-participants";

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

  const [
    { data: event },
    { data: attachedDocs },
    { data: me },
    { data: members },
    { data: signedUp },
    { data: noteRows },
    { data: packingRows },
  ] = await Promise.all([
    supabase.from("trip_events").select("*").eq("id", eventId).eq("trip_id", tripId).single(),
    supabase
      .from("event_documents")
      .select("documents(id, file_name, mime_type)")
      .eq("event_id", eventId),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name, avatar_url)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase.from("event_participants").select("user_id").eq("event_id", eventId),
    supabase
      .from("event_notes")
      .select("id, body, created_at, author_id, profiles!event_notes_author_id_fkey(display_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("checklist_items")
      .select("id, title, done, created_by")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
  ]);

  if (!event) {
    notFound();
  }

  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";
  const canDelete = me?.role === "OWNER" || event.created_by === user.id;

  const signedUpIds = new Set((signedUp ?? []).map((s) => s.user_id));
  const participantOptions = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: m.user_id === user.id ? "Toi" : (m.profiles?.display_name ?? "Voyageur"),
    avatarUrl: m.profiles?.avatar_url ?? null,
    isIn: signedUpIds.has(m.user_id),
    canToggle: canEdit || m.user_id === user.id,
  }));

  const notes: EventNote[] = (noteRows ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    created_at: n.created_at,
    author_id: n.author_id,
    authorName: n.profiles?.display_name ?? "Voyageur",
  }));

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
          {event.notes ? <Row label="Notes" value={<Linkify text={event.notes} />} /> : null}
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

      {canEdit || canDelete ? (
        <EventActions tripId={tripId} eventId={event.id} eventTitle={event.title} />
      ) : null}

      <EventParticipants tripId={tripId} eventId={event.id} options={participantOptions} />

      <EventPacking
        tripId={tripId}
        eventId={event.id}
        items={(packingRows ?? []) as PackingItem[]}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
      />

      <EventNotes
        tripId={tripId}
        eventId={event.id}
        notes={notes}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
      />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-encre-douce">Documents attachés</h2>
          {canEdit ? (
            <DocumentPicker
              tripId={tripId}
              attachedIds={documents.map((d) => d.id)}
              onAttach={attachDocument.bind(null, tripId, eventId)}
            />
          ) : null}
        </div>
        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
            Aucun document attaché pour l'instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border border-laiton-clair bg-papier px-4 py-2.5"
              >
                <a
                  href={`/api/documents/${doc.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-encre hover:underline"
                >
                  {doc.file_name}
                </a>
                {canEdit ? (
                  <form
                    action={async () => {
                      "use server";
                      await detachDocument(tripId, eventId, doc.id);
                    }}
                  >
                    <Button type="submit" variant="ghost" size="sm">
                      Détacher
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
