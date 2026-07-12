"use client";

import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { encryptBytes, sealDocument, toBase64 } from "@/lib/crypto/vault-crypto";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryLabel, type DocumentCategory } from "@/lib/vault/categories";
import { extensionFor, validateFile } from "@/lib/vault/upload";

const ID_CATEGORIES: DocumentCategory[] = ["passport", "id_card", "driving_license"];

export type UploadActionState = ActionState;

type Props = {
  userId: string;
  action: (prev: UploadActionState, formData: FormData) => Promise<UploadActionState>;
  defaultCategory?: DocumentCategory;
  /** Catégories proposées (PHIL-L03 : coffre et voyage n'offrent pas les mêmes). */
  categories?: DocumentCategory[];
  tripId?: string;
  submitLabel: string;
  pendingLabel: string;
  /** PHIL-Q26 : libellé libre ("Forfait de ski") au lieu de la catégorie fermée. */
  freeLabel?: boolean;
  /** PHIL-Q26 : rattacher directement à un événement. */
  events?: { id: string; title: string }[];
  /** PHIL-T01 : chiffrer le fichier côté client avant l'upload (coffre E2EE). */
  encrypt?: boolean;
};

export function UploadForm({
  userId,
  action,
  defaultCategory = "passport",
  categories = CATEGORIES,
  tripId,
  submitLabel,
  pendingLabel,
  freeLabel = false,
  events = [],
  encrypt = false,
}: Props) {
  const t = useT();
  const LABEL_SUGGESTIONS = [
    t("documents.upload.suggestions.ticket"),
    t("documents.upload.suggestions.voucher"),
    t("documents.upload.suggestions.lodging"),
    t("documents.upload.suggestions.insurance"),
    t("documents.upload.suggestions.skiPass"),
    t("documents.upload.suggestions.carRental"),
    t("documents.upload.suggestions.restaurant"),
  ];
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [label, setLabel] = useState("");
  const [eventId, setEventId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [mrzStatus, setMrzStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading">("idle");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) {
      return;
    }
    const problem = validateFile(candidate);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setError(null);
    setFile(candidate);

    // PHIL-N04 : lecture MRZ des passeports (images) — pré-remplit n° et expiration
    if (category === "passport" && candidate.type.startsWith("image/")) {
      setMrzStatus(t("documents.upload.mrz.reading"));
      import("@/lib/vault/mrz")
        .then(({ recognizeMrz }) => recognizeMrz(candidate))
        .then((mrz) => {
          if (mrz?.valid) {
            if (mrz.expirationDate) setExpiresAt(mrz.expirationDate);
            if (mrz.documentNumber) setDocumentNumber(mrz.documentNumber);
            setMrzStatus(t("documents.upload.mrz.verified"));
          } else {
            setMrzStatus(mrz ? t("documents.upload.mrz.uncertain") : null);
          }
        })
        .catch(() => setMrzStatus(null));
    } else {
      setMrzStatus(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("documents.upload.chooseFileFirst"));
      return;
    }

    setPhase("uploading");
    setError(null);

    const documentId = crypto.randomUUID();
    const storagePath = `${userId}/${documentId}.${extensionFor(file.type)}`;

    // Coffre E2EE (PHIL-T01) : on chiffre le fichier CÔTÉ CLIENT avant l'upload.
    // Le Storage ne reçoit alors que du chiffré ; les métadonnées (IV, DEK
    // emballée par la maîtresse) partent en base via le FormData.
    let uploadBody: Blob | File = file;
    let encMeta: { fileIv: string; wrappedDek: string; dekIv: string } | null = null;
    // PHIL-R10 : le n° de pièce aussi est chiffré côté client (avec la maîtresse) —
    // le serveur ne le voit jamais en clair.
    let encDocNumber: { value: string; iv: string } | null = null;
    if (encrypt) {
      try {
        const master = await getCoffreMaster();
        const sealed = await sealDocument(master, new Uint8Array(await file.arrayBuffer()));
        // Le Blob porte le type d'origine (le bucket filtre les MIME) ; son
        // contenu est du chiffré. La route le sert ensuite en octet-stream.
        uploadBody = new Blob([sealed.ciphertext as BlobPart], { type: file.type });
        encMeta = {
          fileIv: toBase64(sealed.iv),
          wrappedDek: toBase64(sealed.wrappedDek),
          dekIv: toBase64(sealed.dekIv),
        };
        if (documentNumber.trim()) {
          const enc = await encryptBytes(master, new TextEncoder().encode(documentNumber.trim()));
          encDocNumber = { value: toBase64(enc.data), iv: toBase64(enc.iv) };
        }
      } catch (err) {
        setPhase("idle");
        setError(err instanceof Error ? err.message : t("documents.upload.genericError"));
        return;
      }
    }

    const supabase = createClient();
    // Le bucket filtre les types MIME (pdf/images) : on garde le type d'origine
    // comme étiquette même pour du chiffré (le contenu reste du chiffré ; la route
    // le sert en octet-stream). Sinon "application/octet-stream" → 400.
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, uploadBody, { contentType: file.type });

    if (uploadError) {
      setPhase("idle");
      setError(t("documents.upload.uploadFailed"));
      return;
    }

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("fileName", file.name);
    formData.set("mimeType", file.type);
    formData.set("sizeBytes", String(file.size));
    formData.set("storagePath", storagePath);
    formData.set("category", category);
    formData.set("expiresAt", expiresAt);
    formData.set("label", label);
    formData.set("eventId", eventId);
    if (encMeta) {
      formData.set("encrypted", "1");
      formData.set("encFileIv", encMeta.fileIv);
      formData.set("encWrappedDek", encMeta.wrappedDek);
      formData.set("encDekIv", encMeta.dekIv);
      // Chiffré : on n'envoie QUE la version chiffrée du n° (jamais le clair).
      if (encDocNumber) {
        formData.set("encDocumentNumber", encDocNumber.value);
        formData.set("encDocumentNumberIv", encDocNumber.iv);
      }
    } else {
      // Non chiffré (doc voyage legacy) : n° en clair comme avant.
      formData.set("documentNumber", documentNumber);
    }
    if (tripId) {
      formData.set("tripId", tripId);
    }

    startTransition(async () => {
      const result: UploadActionState = await action({ status: "idle" }, formData);
      setPhase("idle");
      if (result.status === "error") {
        setError(result.message ?? t("documents.upload.genericError"));
      }
    });
  }

  const busy = phase === "uploading" || pending;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: zone de drop, l'input reste le contrôle accessible */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-line bg-line/20" : "border-line bg-card/60",
        )}
      >
        {file ? (
          <>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-slate">
              {(file.size / 1024 / 1024).toFixed(1)} {t("documents.upload.sizeUnit")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
            >
              {t("documents.upload.changeFile")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate">{t("documents.upload.dropHint")}</p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              {t("documents.upload.browse")}
            </Button>
            <p className="text-xs text-slate">{t("documents.upload.fileConstraints")}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/heic,image/heif"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      {freeLabel ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-label">{t("documents.upload.docType")}</Label>
          <Input
            id="doc-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("documents.upload.docTypePlaceholder")}
            maxLength={60}
            list="doc-label-suggestions"
            autoComplete="off"
          />
          <datalist id="doc-label-suggestions">
            {LABEL_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">{t("documents.upload.category")}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(t, c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* PHIL-Q34 : "Autre" → libellé libre saisi à la main */}
          {category === "other" ? (
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("documents.upload.otherPlaceholder")}
              maxLength={60}
              autoComplete="off"
              aria-label={t("documents.upload.otherAria")}
            />
          ) : null}
        </div>
      )}

      {events.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-event">{t("documents.upload.attachEvent")}</Label>
          <select
            id="doc-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-md border border-line bg-card px-3 py-2 text-sm"
          >
            <option value="">{t("documents.upload.noEvent")}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {mrzStatus ? <p className="text-xs text-mist">{mrzStatus}</p> : null}
        <Label htmlFor="expiresAt">{t("documents.upload.expiryOptional")}</Label>
        <Input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      {ID_CATEGORIES.includes(category) ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="documentNumber">{t("documents.upload.documentNumberOptional")}</Label>
          <Input
            id="documentNumber"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder={t("documents.upload.documentNumberPlaceholder")}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy || !file}>
          {busy ? pendingLabel : submitLabel}
        </Button>
        {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}
      </div>
    </form>
  );
}
