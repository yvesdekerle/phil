"use client";

import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractGps } from "@/lib/photos/exif-gps";
import {
  formatBytes,
  MAX_PHOTO_BYTES,
  PHOTO_MIME_TYPES,
  photoExtension,
} from "@/lib/photos/limits";
import { makeThumbnail } from "@/lib/photos/thumbnail";
import { createClient } from "@/lib/supabase/client";
import { palette } from "@/lib/ui/colors";
import { deletePhoto, type PhotoState, registerPhoto } from "./actions";

type Photo = {
  id: string;
  caption: string | null;
  uploadedBy: string;
  uploaderName: string;
  sizeBytes: number;
  hasThumb: boolean;
  eventId: string | null;
  lat: number | null;
  lng: number | null;
};
type EventOption = { id: string; title: string };

/** Galerie photos (PHIL-O10) : grille de vignettes, upload avec quota strict. */
export function PhotosClient({
  tripId,
  photos,
  events,
  myId,
  userId,
  isOwner,
  quota,
}: {
  tripId: string;
  photos: Photo[];
  events: EventOption[];
  myId: string;
  userId: string;
  isOwner: boolean;
  quota: number;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const eventRef = useRef<HTMLSelectElement>(null);

  // PHIL-Q12/Q14 : carte des photos géolocalisées au-dessus de la grille
  const located = photos.filter((p) => p.lat !== null && p.lng !== null);

  // PHIL-Q02 : visionneuse
  const [lightbox, setLightbox] = useState<number | null>(null);
  const step = useCallback(
    (delta: number) => {
      setLightbox((current) =>
        current === null ? null : (current + delta + photos.length) % photos.length,
      );
    },
    [photos.length],
  );
  useEffect(() => {
    if (lightbox === null) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, step]);

  const usedBytes = photos.reduce((s, p) => s + p.sizeBytes, 0);
  const remaining = quota - photos.length;

  async function uploadFiles(files: FileList) {
    setError(null);
    const list = Array.from(files);
    if (list.length > remaining) {
      setError(
        (remaining <= 1 ? t("photos.remainingOne") : t("photos.remainingMany"))
          .replace("{n}", String(remaining))
          .replace("{quota}", String(quota)),
      );
      return;
    }
    const supabase = createClient();
    const caption = captionRef.current?.value ?? "";
    const eventId = eventRef.current?.value ?? "";

    for (const [index, file] of list.entries()) {
      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError(t("photos.unsupportedFormat").replace("{name}", file.name));
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(
          t("photos.tooLarge")
            .replace("{name}", file.name)
            .replace("{max}", formatBytes(MAX_PHOTO_BYTES)),
        );
        continue;
      }
      setProgress(
        t("photos.uploadProgress")
          .replace("{i}", String(index + 1))
          .replace("{n}", String(list.length)),
      );

      const photoId = crypto.randomUUID();
      const storagePath = `${userId}/${photoId}.${photoExtension(file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: file.type });
      if (upErr) {
        setError(t("photos.uploadFailed").replace("{name}", file.name));
        continue;
      }

      let thumbPath = "";
      const thumb = await makeThumbnail(file);
      if (thumb) {
        thumbPath = `${userId}/${photoId}_thumb.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from("photos")
          .upload(thumbPath, thumb, { contentType: "image/jpeg" });
        if (thumbErr) {
          thumbPath = "";
        }
      }

      // PHIL-Q12 : position GPS lue dans l'EXIF (jamais bloquant)
      const gps = await extractGps(file);

      const formData = new FormData();
      formData.set("tripId", tripId);
      formData.set("photoId", photoId);
      formData.set("storagePath", storagePath);
      formData.set("thumbPath", thumbPath);
      formData.set("sizeBytes", String(file.size));
      formData.set("caption", caption);
      formData.set("eventId", eventId);
      formData.set("lat", gps ? String(gps.lat) : "");
      formData.set("lng", gps ? String(gps.lng) : "");
      const result: PhotoState = await registerPhoto({ status: "idle" }, formData);
      if (result.status === "error") {
        setError(result.message ?? t("photos.saveFailed"));
      }
    }
    setProgress(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-sm text-slate">
        <span className="font-medium text-ink">
          {photos.length}/{quota} {t("photos.photos")}
        </span>{" "}
        · {formatBytes(usedBytes)} {t("photos.qualityNote")}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={remaining <= 0 || progress !== null}
            onClick={() => inputRef.current?.click()}
          >
            {progress ?? (remaining <= 0 ? t("photos.quotaReachedShort") : t("photos.add"))}
          </Button>
          <Input
            ref={captionRef}
            placeholder={t("photos.captionPlaceholder")}
            maxLength={300}
            className="h-9 min-w-40 flex-1 text-sm"
          />
          <select
            ref={eventRef}
            defaultValue=""
            className="h-9 rounded border border-line bg-card px-2 text-sm text-slate"
            aria-label={t("photos.attachEventAria")}
          >
            <option value="">{t("photos.attachEventOption")}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate">{t("photos.nextUploadNote")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error ? <p className="text-sm text-lagoon-ink">{error}</p> : null}

      {located.length > 0 ? (
        <div>
          <TripMapLazy
            markers={located.map(
              (p): MapMarker => ({
                id: p.id,
                lat: p.lat as number,
                lng: p.lng as number,
                title: p.caption ?? t("photos.markerTitle"),
                subtitle: p.uploaderName,
                color: palette.lagoonInk,
                thumbUrl: `/api/photos/${p.id}/view${p.hasThumb ? "?thumb=1" : ""}`,
              }),
            )}
          />
          <p className="mt-1 text-xs text-slate">
            {located.length}/{photos.length}{" "}
            {located.length > 1 ? t("photos.geolocatedCountMany") : t("photos.geolocatedCountOne")}{" "}
            {t("photos.gpsNote")}
          </p>
        </div>
      ) : null}

      {photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-card/60 px-6 py-14 text-center">
          <p className="text-subhead text-ink">{t("photos.emptyTitle")}</p>
          <p className="mt-2 text-sm text-slate">
            {t("photos.emptyBody").replace("{quota}", String(quota))}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, index) => (
            <li key={p.id} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(index)}
                className="block w-full overflow-hidden rounded-lg border border-line bg-sand"
                aria-label={t("photos.open").replace("{name}", p.caption ?? t("photos.thePhoto"))}
              >
                {/* Vignette générée côté client ; l'original ne charge que dans la visionneuse */}
                {/* biome-ignore lint/performance/noImgElement: source authentifiée dynamique, next/image inutile ici */}
                <img
                  src={`/api/photos/${p.id}/view${p.hasThumb ? "?thumb=1" : ""}`}
                  alt={p.caption ?? t("photos.altFallback")}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
              {p.caption ? (
                <p className="mt-1 truncate text-xs text-slate" title={p.caption}>
                  {p.caption}
                </p>
              ) : null}
              <p className="text-[0.65rem] text-slate/70">{p.uploaderName}</p>
              {p.uploadedBy === myId || isOwner ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => deletePhoto(tripId, p.id))}
                  className="absolute top-1.5 right-1.5 rounded-full bg-ink-deep/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={t("photos.deleteAria")}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {lightbox !== null && photos[lightbox] ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/95"
          role="dialog"
          aria-modal="true"
          aria-label={t("photos.viewerAria")}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm opacity-80">
              {lightbox + 1}/{photos.length} · {photos[lightbox].uploaderName}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label={t("photos.close")}
              className="rounded-full p-2 hover:bg-card/10"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: clic sur le fond = fermer, doublé par le bouton Fermer */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Échap gère le clavier (useEffect), le bouton Fermer est focusable */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-12"
            onClick={(e) => e.target === e.currentTarget && setLightbox(null)}
          >
            {/* biome-ignore lint/performance/noImgElement: original authentifié, taille inconnue */}
            <img
              src={`/api/photos/${photos[lightbox].id}/view`}
              alt={photos[lightbox].caption ?? t("photos.altFallback")}
              className="max-h-full max-w-full object-contain"
            />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("photos.prev")}
                  className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-card/20"
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("photos.next")}
                  className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-card/20"
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
          {photos[lightbox].caption ? (
            <p className="px-4 py-3 text-center text-sm text-white/90">
              {photos[lightbox].caption}
            </p>
          ) : (
            <div className="py-3" />
          )}
        </div>
      ) : null}
    </div>
  );
}
