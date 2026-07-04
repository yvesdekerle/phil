"use client";

import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const eventRef = useRef<HTMLSelectElement>(null);

  // PHIL-Q12 : bascule grille / carte
  const [view, setView] = useState<"grid" | "map">("grid");
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
        `Plus que ${remaining} photo${remaining > 1 ? "s" : ""} possible${remaining > 1 ? "s" : ""} sur ce voyage (quota ${quota}).`,
      );
      return;
    }
    const supabase = createClient();
    const caption = captionRef.current?.value ?? "";
    const eventId = eventRef.current?.value ?? "";

    for (const [index, file] of list.entries()) {
      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError(`${file.name} : format non pris en charge (JPEG, PNG ou WebP).`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`${file.name} : trop lourde (max ${formatBytes(MAX_PHOTO_BYTES)}).`);
        continue;
      }
      setProgress(`Envoi ${index + 1}/${list.length}…`);

      const photoId = crypto.randomUUID();
      const storagePath = `${userId}/${photoId}.${photoExtension(file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { contentType: file.type });
      if (upErr) {
        setError(`${file.name} : l'envoi a échoué.`);
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
        setError(result.message ?? "Enregistrement impossible.");
      }
    }
    setProgress(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-encre-douce">
          <span className="font-medium text-encre">
            {photos.length}/{quota} photos
          </span>{" "}
          · {formatBytes(usedBytes)} — qualité d&apos;origine conservée, nombre limité.
        </div>
        <Button
          type="button"
          disabled={remaining <= 0 || progress !== null}
          onClick={() => inputRef.current?.click()}
        >
          {progress ?? (remaining <= 0 ? "Quota atteint" : "Ajouter des photos")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input
          ref={captionRef}
          placeholder="Légende (optionnelle, appliquée à l'envoi)"
          maxLength={300}
          className="h-8 max-w-xs text-sm"
        />
        <select
          ref={eventRef}
          defaultValue=""
          className="h-8 rounded border border-laiton-clair bg-papier px-2 text-sm text-encre-douce"
          aria-label="Événement lié"
        >
          <option value="">Sans événement</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}

      {photos.length > 0 ? (
        <nav className="flex gap-1 text-sm" aria-label="Vues des photos">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={
              view === "grid"
                ? "rounded-full bg-bordeaux px-3 py-1 font-medium text-papier"
                : "rounded-full px-3 py-1 text-encre-douce hover:bg-laiton/10 hover:text-encre"
            }
          >
            Grille
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={
              view === "map"
                ? "rounded-full bg-bordeaux px-3 py-1 font-medium text-papier"
                : "rounded-full px-3 py-1 text-encre-douce hover:bg-laiton/10 hover:text-encre"
            }
          >
            Carte ({located.length})
          </button>
        </nav>
      ) : null}

      {view === "map" && photos.length > 0 ? (
        located.length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
            Aucune photo géolocalisée — la position GPS est lue automatiquement dans les photos
            (JPEG) qui en contiennent.
          </p>
        ) : (
          <TripMapLazy
            markers={located.map(
              (p): MapMarker => ({
                id: p.id,
                lat: p.lat as number,
                lng: p.lng as number,
                title: p.caption ?? "Photo",
                subtitle: p.uploaderName,
                color: "#6e1f2e",
              }),
            )}
          />
        )
      ) : null}

      {view === "map" ? null : photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Aucune photo pour l&apos;instant</p>
          <p className="mt-2 text-sm text-encre-douce">
            Les plus beaux souvenirs se rangent ici — {quota} par voyage, choisis bien.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, index) => (
            <li key={p.id} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(index)}
                className="block w-full overflow-hidden rounded-lg border border-laiton-clair bg-parchemin"
                aria-label={`Ouvrir ${p.caption ?? "la photo"}`}
              >
                {/* Vignette générée côté client ; l'original ne charge que dans la visionneuse */}
                {/* biome-ignore lint/performance/noImgElement: source authentifiée dynamique, next/image inutile ici */}
                <img
                  src={`/api/photos/${p.id}/view${p.hasThumb ? "?thumb=1" : ""}`}
                  alt={p.caption ?? "Photo du voyage"}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
              {p.caption ? (
                <p className="mt-1 truncate text-xs text-encre-douce" title={p.caption}>
                  {p.caption}
                </p>
              ) : null}
              <p className="text-[0.65rem] text-encre-douce/70">{p.uploaderName}</p>
              {p.uploadedBy === myId || isOwner ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => deletePhoto(tripId, p.id))}
                  className="absolute top-1.5 right-1.5 rounded-full bg-encre/60 p-1.5 text-papier opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Supprimer la photo"
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
          className="fixed inset-0 z-50 flex flex-col bg-encre/95"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photos"
        >
          <div className="flex items-center justify-between px-4 py-3 text-papier">
            <span className="text-sm opacity-80">
              {lightbox + 1}/{photos.length} · {photos[lightbox].uploaderName}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Fermer"
              className="rounded-full p-2 hover:bg-papier/10"
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
              alt={photos[lightbox].caption ?? "Photo du voyage"}
              className="max-h-full max-w-full object-contain"
            />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Photo précédente"
                  className="absolute left-2 rounded-full bg-papier/10 p-2 text-papier hover:bg-papier/20"
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Photo suivante"
                  className="absolute right-2 rounded-full bg-papier/10 p-2 text-papier hover:bg-papier/20"
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
          {photos[lightbox].caption ? (
            <p className="px-4 py-3 text-center text-sm text-papier/90">
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
