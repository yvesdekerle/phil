"use client";

import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { setCoverFromUpload, setCoverFromUrl } from "./actions";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Upload d'image de couverture (PHIL-D09) — bucket public `covers`. */
export function CoverUpload({ tripId }: { tripId: string }) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  function onUrl() {
    setMessage(null);
    setError(null);
    if (!url.trim()) {
      return;
    }
    startTransition(async () => {
      const result = await setCoverFromUrl(tripId, url.trim());
      if (result.status === "error") {
        setError(result.message ?? t("settings.cover.errSave"));
        return;
      }
      setMessage(t("settings.cover.done"));
      setUrl("");
      router.refresh();
    });
  }

  function onFile(file: File | undefined) {
    setMessage(null);
    setError(null);
    if (!file) {
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError(t("settings.cover.errType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("settings.cover.errSize"));
      return;
    }

    startTransition(async () => {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
      if (uploadError) {
        setError(t("settings.cover.errUpload"));
        return;
      }
      const result = await setCoverFromUpload(tripId, path);
      if (result.status === "error") {
        setError(result.message ?? t("settings.cover.errSave"));
        return;
      }
      setMessage(t("settings.cover.done"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-card px-5 py-4">
      <p className="text-sm font-medium text-ink">{t("settings.cover.title")}</p>
      <p className="text-xs text-slate">{t("settings.cover.desc")}</p>
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
          {pending ? t("settings.cover.uploading") : t("settings.cover.choose")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onUrl();
            }
          }}
          placeholder={t("settings.cover.urlPlaceholder")}
          disabled={pending}
          className="h-9 min-w-0 flex-1"
        />
        <Button type="button" variant="outline" disabled={pending || !url.trim()} onClick={onUrl}>
          {t("settings.cover.urlSubmit")}
        </Button>
      </div>

      {message ? <p className="text-xs text-slate">{message}</p> : null}
      {error ? <p className="text-caption text-berry-ink">{error}</p> : null}
    </div>
  );
}
