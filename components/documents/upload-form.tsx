"use client";

import { useRef, useState, useTransition } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_LABELS, type DocumentCategory } from "@/lib/vault/categories";
import { extensionFor, validateFile } from "@/lib/vault/upload";

const ID_CATEGORIES: DocumentCategory[] = ["passport", "id_card", "driving_license"];

export type UploadActionState = { status: "idle" | "error"; message?: string };

type Props = {
  userId: string;
  action: (prev: UploadActionState, formData: FormData) => Promise<UploadActionState>;
  defaultCategory?: DocumentCategory;
  /** Catégories proposées (PHIL-L03 : coffre et voyage n'offrent pas les mêmes). */
  categories?: DocumentCategory[];
  tripId?: string;
  submitLabel: string;
  pendingLabel: string;
};

export function UploadForm({
  userId,
  action,
  defaultCategory = "passport",
  categories = CATEGORIES,
  tripId,
  submitLabel,
  pendingLabel,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [expiresAt, setExpiresAt] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
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
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisis d'abord un fichier.");
      return;
    }

    setPhase("uploading");
    setError(null);

    const documentId = crypto.randomUUID();
    const storagePath = `${userId}/${documentId}.${extensionFor(file.type)}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      setPhase("idle");
      setError("L'envoi du fichier a échoué. Vérifie ta connexion et réessaie.");
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
    formData.set("documentNumber", documentNumber);
    if (tripId) {
      formData.set("tripId", tripId);
    }

    startTransition(async () => {
      const result: UploadActionState = await action({ status: "idle" }, formData);
      setPhase("idle");
      if (result.status === "error") {
        setError(result.message ?? "Une erreur est survenue.");
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
          dragging ? "border-laiton bg-laiton-clair/20" : "border-laiton-clair bg-papier/60",
        )}
      >
        {file ? (
          <>
            <p className="text-sm font-medium text-encre">{file.name}</p>
            <p className="text-xs text-encre-douce">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
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
              Changer de fichier
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-encre-douce">Glisse ton document ici, ou</p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Parcourir…
            </Button>
            <p className="text-xs text-encre-douce">PDF, JPG, PNG ou HEIC — 10 Mo max</p>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Catégorie</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expiresAt">Date d'expiration (optionnel)</Label>
        <Input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      {ID_CATEGORIES.includes(category) ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="documentNumber">Numéro du document (optionnel)</Label>
          <Input
            id="documentNumber"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Ex : 24FV12345"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy || !file}>
          {busy ? pendingLabel : submitLabel}
        </Button>
        {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
      </div>
    </form>
  );
}
