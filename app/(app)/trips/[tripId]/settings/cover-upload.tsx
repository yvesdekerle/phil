"use client";

import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setCoverFromUpload } from "./actions";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Upload d'image de couverture (PHIL-D09) — bucket public `covers`. */
export function CoverUpload({ tripId }: { tripId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(file: File | undefined) {
    setMessage(null);
    setError(null);
    if (!file) {
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError("JPG, PNG ou WebP uniquement.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("3 Mo maximum — recadre ou compresse l'image.");
      return;
    }

    startTransition(async () => {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
      if (uploadError) {
        setError("L'envoi a échoué — il faut être capitaine ou éditeur.");
        return;
      }
      const result = await setCoverFromUpload(tripId, path);
      if (result.status === "error") {
        setError(result.message ?? "Impossible d'enregistrer la couverture.");
        return;
      }
      setMessage("Nouvelle couverture en place.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">Image de couverture</p>
      <p className="text-xs text-encre-douce">
        Téléverse une photo (JPG/PNG/WebP, 3 Mo max) — ou colle une URL dans le formulaire
        ci-dessous.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <ImageUp aria-hidden="true" />
          {pending ? "Envoi…" : "Choisir une image"}
        </Button>
        {message ? <p className="text-xs text-encre-douce">{message}</p> : null}
        {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
      </div>
    </div>
  );
}
