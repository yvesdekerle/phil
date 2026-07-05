"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRANSPORT_MODE_LABELS, TRANSPORT_MODES } from "@/lib/events/transport";
import type { ExtractedReservation } from "@/lib/import/reservation";
import { createClient } from "@/lib/supabase/client";
import { extensionFor } from "@/lib/vault/upload";
import { createImportedEvent, finalizeDraft, type ImportedEventState } from "./actions";

const KINDS = ["TRANSPORT", "LODGING", "ACTIVITY"] as const;

/** Import de réservation (PHIL-O01) : analyse → formulaire pré-rempli → création. */
export function ImportClient({
  tripId,
  userId,
  defaultTimezone,
  draft,
}: {
  tripId: string;
  userId: string;
  defaultTimezone: string;
  /** PHIL-P02 : brouillon reçu par email, pré-validé (pas de fichier à envoyer). */
  draft?: { id: string; extracted: ExtractedReservation; fileName: string | null };
}) {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"pick" | "analyzing" | "review" | "saving">(
    draft ? "review" : "pick",
  );
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReservation | null>(draft?.extracted ?? null);
  const [kind, setKind] = useState<"TRANSPORT" | "LODGING" | "ACTIVITY">(
    draft?.extracted.kind ?? "ACTIVITY",
  );
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
        setError(json.error ?? t("events.import.analyzeFailed"));
        setPhase("pick");
        return;
      }
      setExtracted(json.extracted);
      setKind(json.extracted.kind);
      setPhase("review");
    } catch {
      setError(t("events.import.analyzeFailedRetry"));
      setPhase("pick");
    }
  }

  async function save(formData: FormData) {
    // Brouillon email : pas d'upload, la pièce jointe est déjà côté serveur
    if (draft) {
      setError(null);
      setPhase("saving");
      formData.set("tripId", tripId);
      formData.set("kind", kind);
      formData.set("draftId", draft.id);
      startTransition(async () => {
        const result: ImportedEventState = await finalizeDraft({ status: "idle" }, formData);
        if (result.status === "error") {
          setError(result.message ?? t("events.import.createFailed"));
          setPhase("review");
        }
      });
      return;
    }

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
      setError(t("events.import.uploadFailed"));
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
        setError(result.message ?? t("events.import.createFailed"));
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
            : t("events.import.pickPlaceholder")}
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
          {phase === "analyzing" ? t("events.import.analyzing") : t("events.import.analyze")}
        </Button>
      </div>
    );
  }

  const e = extracted;
  return (
    <form action={save} className="flex flex-col gap-4">
      <p className="rounded-md bg-laiton/10 px-3 py-2 text-xs text-encre-douce">
        {t("events.import.reviewNote")}
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">{t("events.form.type")}</Label>
        <select
          id="kind"
          value={kind}
          onChange={(ev) => setKind(ev.target.value as typeof kind)}
          className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`events.type.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("events.form.title")}</Label>
        <Input id="title" name="title" defaultValue={e?.title ?? ""} required maxLength={150} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAtLocal">
            {kind === "LODGING" ? t("events.import.checkInLocal") : t("events.import.startLocal")}
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
            {kind === "LODGING" ? t("events.import.checkOutLocal") : t("events.import.endOptional")}
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
        <Label htmlFor="timezone">{t("events.form.timezoneEntered")}</Label>
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
              <Label htmlFor="from">{t("events.form.from")}</Label>
              <Input id="from" name="from" defaultValue={e?.from ?? ""} maxLength={120} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">{t("events.form.to")}</Label>
              <Input id="to" name="to" defaultValue={e?.to ?? ""} maxLength={120} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transportMode">{t("events.form.mode")}</Label>
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
            <Label htmlFor="locationName">{t("events.form.location")}</Label>
            <Input
              id="locationName"
              name="locationName"
              defaultValue={e?.locationName ?? ""}
              maxLength={150}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="locationAddress">{t("events.form.address")}</Label>
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
          <Label htmlFor="carrier">{t("events.import.carrier")}</Label>
          <Input id="carrier" name="carrier" defaultValue={e?.carrier ?? ""} maxLength={120} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookingReference">{t("events.import.bookingRef")}</Label>
          <Input
            id="bookingReference"
            name="bookingReference"
            defaultValue={e?.bookingReference ?? ""}
            maxLength={100}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t("events.form.notes")}</Label>
        <Input id="notes" name="notes" defaultValue={e?.notes ?? ""} maxLength={2000} />
      </div>

      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={phase === "saving"}>
          {phase === "saving" ? t("events.import.saving") : t("events.import.create")}
        </Button>
        {!draft ? (
          <Button type="button" variant="ghost" onClick={() => setPhase("pick")}>
            {t("events.import.restartAnalysis")}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-encre-douce">
        {draft
          ? draft.fileName
            ? `${t("events.import.footnoteDraftFilePrefix")}${draft.fileName}${t("events.import.footnoteDraftFileSuffix")}`
            : t("events.import.footnoteDraftNoFile")
          : t("events.import.footnoteFile")}
      </p>
    </form>
  );
}
