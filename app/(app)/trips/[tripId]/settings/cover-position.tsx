"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { parseCover } from "@/lib/trips/cover";
import { setCoverPosition } from "./actions";

/**
 * Cadrage de la couverture (PHIL-Q37c) — aperçu + curseurs pour choisir la
 * partie visible d'une image plus grande que la bannière.
 */
export function CoverPosition({ tripId, src }: { tripId: string; src: string }) {
  const t = useT();
  const router = useRouter();
  const init = parseCover(src);
  const [x, setX] = useState(init.x);
  const [y, setY] = useState(init.y);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    startTransition(async () => {
      await setCoverPosition(tripId, x, y);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">{t("settings.cover.frameTitle")}</p>
      <p className="text-xs text-encre-douce">{t("settings.cover.frameHint")}</p>
      <div className="relative h-40 w-full overflow-hidden rounded-lg border border-laiton-clair bg-encre">
        <Image
          src={init.base}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover"
          style={{ objectPosition: `${x}% ${y}%` }}
        />
      </div>
      <label className="flex items-center gap-3 text-xs text-encre-douce">
        <span className="w-20 shrink-0">{t("settings.cover.vertical")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={y}
          disabled={pending}
          onChange={(e) => setY(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="flex-1 accent-bordeaux"
          aria-label={t("settings.cover.vertical")}
        />
      </label>
      <label className="flex items-center gap-3 text-xs text-encre-douce">
        <span className="w-20 shrink-0">{t("settings.cover.horizontal")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={x}
          disabled={pending}
          onChange={(e) => setX(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="flex-1 accent-bordeaux"
          aria-label={t("settings.cover.horizontal")}
        />
      </label>
    </div>
  );
}
