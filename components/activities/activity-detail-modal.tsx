"use client";

import { ChevronLeft, ChevronRight, Clock, Tag, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";
import type { SwipeActivity } from "./swipe-deck";

/**
 * Fiche détaillée d'une activité (PHIL-U04 Phase 2), ouverte au **tap** sur la
 * carte (le hook de geste expose déjà `onTap`). Description complète, prix/durée,
 * tags, et carousel photos façon lightbox de la galerie Phil — gracieux quand
 * l'activité n'a pas (encore) de photo.
 */
export function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: SwipeActivity;
  onClose: () => void;
}) {
  const t = useT();
  const photos = activity.photoUrls;
  const [index, setIndex] = useState(0);
  const hasPhotos = photos.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (hasPhotos && e.key === "ArrowRight") {
        setIndex((i) => Math.min(i + 1, photos.length - 1));
      } else if (hasPhotos && e.key === "ArrowLeft") {
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, hasPhotos, photos.length]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Échap gère le clavier (useEffect), le bouton Fermer est focusable
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-encre/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={activity.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-papier shadow-2xl sm:rounded-2xl">
        <div className="relative h-56 shrink-0 overflow-hidden bg-gradient-to-br from-parchemin to-laiton-clair/40">
          {hasPhotos ? (
            // biome-ignore lint/performance/noImgElement: URLs externes (Pexels/bucket), taille inconnue
            <img
              src={photos[index]}
              alt={activity.title}
              className="size-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex size-full items-end p-5">
              <span className="font-display text-3xl text-laiton/60">{activity.title}</span>
            </div>
          )}

          {hasPhotos && photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
                aria-label={t("activities.prevPhoto")}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-encre/40 p-1.5 text-papier hover:bg-encre/60 disabled:opacity-0"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(i + 1, photos.length - 1))}
                disabled={index === photos.length - 1}
                aria-label={t("activities.nextPhoto")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-encre/40 p-1.5 text-papier hover:bg-encre/60 disabled:opacity-0"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((src, i) => (
                  <span
                    key={src}
                    className={cn(
                      "size-1.5 rounded-full",
                      i === index ? "bg-papier" : "bg-papier/40",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            aria-label={t("activities.close")}
            className="absolute top-3 right-3 rounded-full bg-encre/40 p-1.5 text-papier hover:bg-encre/60"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-5">
          {activity.category ? (
            <span className="text-xs uppercase tracking-wide text-laiton">{activity.category}</span>
          ) : null}
          <h2 className="font-display text-2xl text-encre">{activity.title}</h2>
          {activity.location ? (
            <p className="text-sm text-encre-douce">📍 {activity.location}</p>
          ) : null}

          {activity.priceText || activity.durationText ? (
            <div className="flex flex-wrap gap-2">
              {activity.priceText ? (
                <span className="flex items-center gap-1.5 rounded-full bg-laiton/10 px-2.5 py-1 text-xs text-encre">
                  <Wallet className="size-3.5 text-laiton" aria-hidden="true" />
                  {activity.priceText}
                </span>
              ) : null}
              {activity.durationText ? (
                <span className="flex items-center gap-1.5 rounded-full bg-laiton/10 px-2.5 py-1 text-xs text-encre">
                  <Clock className="size-3.5 text-laiton" aria-hidden="true" />
                  {activity.durationText}
                </span>
              ) : null}
            </div>
          ) : null}

          {activity.description ? (
            <p className="whitespace-pre-line text-sm text-encre-douce">{activity.description}</p>
          ) : null}

          {activity.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {activity.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-laiton/15 px-2 py-0.5 text-xs text-laiton"
                >
                  <Tag className="size-3" aria-hidden="true" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
