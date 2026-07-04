"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRANSPORT_MODE_LABELS, TRANSPORT_MODES } from "@/lib/events/transport";
import type { ExtractedReservation } from "@/lib/import/reservation";
import { createClient } from "@/lib/supabase/client";
import { extensionFor } from "@/lib/vault/upload";
import { createImportedEvent, type ImportedEventState } from "./actions";

const KIND_LABELS = {
  TRANSPORT: "Transport",
  LODGING: "Hébergement",
  ACTIVITY: "Activité",
} as const;

/** Import de réservation (PHIL-O01) : analyse → formulaire pré-rempli → création. */
export function ImportClient({
  tripId,
  userId,
  defaultTimezone,
}: {
  tripId: string;
  userId: string;
  defaultTimezone: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"pick" | "analyzing" | "review" | "saving">("pick");
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReservation | null>(null);
  const [kind, setKind] = useState<"TRANSPORT" | "LODGING" | "ACTIVITY">("ACTIVITY");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  async function analyze() {
    if (files.length === 0) {
      return;
    }
    setError(null);
    setPhase("analyzing");
    const body = new FormData();
    for (const f of files) {
      body.append("files", f);
    }
    try {
      const r = await fetch(`/api/trips/${tripId}/import-reservation`, { method: "POST", body });
      const json = (await r.json()) as { extracted?: ExtractedReservation; error?: string };
      if (!r.ok || !json.extracted) {
        setError(json.error ?? "L'analyse a échoué.");
        setPhase("pick");
        return;
      }
      setExtracted(json.extracted);
      setKind(json.extracted.kind);
      setPhase("review");
    } catch {
      setError("L'analyse a échoué — réessaie dans un instant.");
      setPhase("pick");
    }
  }

  async function save(formData: FormData) {
    const file = files[0];
    if (!file) {
      return;
    }
    setError(null);
    setPhase("saving");

    // La confirmation devient un document du voyage : upload dans son dossier
    const supabase = createClient();
    const documentId = crypto.randomUUID();
    const storagePath = `${userId}/${documentId}.${extensionFor(file.type)}`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });
    if (upErr) {
      setError("L'envoi du fichier a échoué.");
      setPhase("review");
      return;
    }

    formData.set("tripId", tripId);
    formData.set("kind", kind);
    formData.set("documentId", documentId);
    formData.set("fileName", file.name);
    formData.set("mimeType", file.type);
    formData.set("sizeBytes", String(file.size));
    formData.set("storagePath", storagePath);

    startTransition(async () => {
      const result: ImportedEventState = await createImportedEvent({ status: "idle" }, formData);
      if (result.status === "error") {
        setError(result.message ?? "La création a échoué.");
        setPhase("review");
      }
    });
  }

  if (phase === "pick" || phase === "analyzing") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border-2 border-dashed border-laiton-clair bg-papier/60 px-6 py-12 text-center text-sm text-encre-douce transition-colors hover:border-laiton hover:text-encre"
        >
          {files.length > 0
            ? files.map((f) => f.name).join(", ")
            : "Choisir le PDF ou les captures d'écran de la confirmation"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
        />
        {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
        <Button
          type="button"
          disabled={files.length === 0 || phase === "analyzing"}
          onClick={analyze}
        >
          {phase === "analyzing" ? "Phil déchiffre la réservation…" : "Analyser"}
        </Button>
      </div>
    );
  }

  const e = extracted;
  return (
    <form action={save} className="flex flex-col gap-4">
      <p className="rounded-md bg-laiton/10 px-3 py-2 text-xs text-encre-douce">
        Vérifie ce que j&apos;ai lu — rien n&apos;est créé avant que tu confirmes.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Type</Label>
        <select
          id="kind"
          value={kind}
          onChange={(ev) => setKind(ev.target.value as typeof kind)}
          className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
        >
          {(Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" defaultValue={e?.title ?? ""} required maxLength={150} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">
            {kind === "LODGING" ? "Check-in (heure locale)" : "Début (heure locale)"}
          </Label>
          <Input
            id="startsAtLocal"
            name="startsAtLocal"
            type="datetime-local"
            defaultValue={e?.startsAtLocal ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsAtLocal">
            {kind === "LODGING" ? "Check-out (heure locale)" : "Fin (optionnel)"}
          </Label>
          <Input
            id="endsAtLocal"
            name="endsAtLocal"
            type="datetime-local"
            defaultValue={e?.endsAtLocal ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuseau horaire des heures saisies</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={
            e?.timezone && timezones.includes(e.timezone) ? e.timezone : defaultTimezone
          }
          className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {kind === "TRANSPORT" ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="from">Départ</Label>
              <Input id="from" name="from" defaultValue={e?.from ?? ""} maxLength={120} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">Arrivée</Label>
              <Input id="to" name="to" defaultValue={e?.to ?? ""} maxLength={120} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transportMode">Mode</Label>
            <select
              id="transportMode"
              name="transportMode"
              defaultValue={e?.transportMode ?? "other"}
              className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {TRANSPORT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="locationName">Lieu</Label>
            <Input
              id="locationName"
              name="locationName"
              defaultValue={e?.locationName ?? ""}
              maxLength={150}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="locationAddress">Adresse</Label>
            <Input
              id="locationAddress"
              name="locationAddress"
              defaultValue={e?.locationAddress ?? ""}
              maxLength={300}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="carrier">Compagnie / plateforme</Label>
          <Input id="carrier" name="carrier" defaultValue={e?.carrier ?? ""} maxLength={120} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookingReference">N° de réservation</Label>
          <Input
            id="bookingReference"
            name="bookingReference"
            defaultValue={e?.bookingReference ?? ""}
            maxLength={100}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" defaultValue={e?.notes ?? ""} maxLength={2000} />
      </div>

      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={phase === "saving"}>
          {phase === "saving" ? "Phil consigne tout ça…" : "Créer l'événement"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setPhase("pick")}>
          Reprendre l&apos;analyse
        </Button>
      </div>
      <p className="text-xs text-encre-douce">
        Le fichier sera rangé dans les Documents du voyage et attaché à l&apos;événement.
      </p>
    </form>
  );
}
