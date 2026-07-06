"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { parseCover } from "@/lib/trips/cover";
import { setCoverPosition } from "./actions";

/** Ratio de la bannière du voyage (≈ pleine largeur × h-52). */
const BANNER_ASPECT = 1024 / 200;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Cadrage de la couverture (PHIL-Q37c) — l'image entière avec un cadre clair sur
 * la zone conservée (le reste assombri), qu'on fait glisser pour choisir ce qui
 * s'affiche dans la bannière. La position est encodée dans l'URL (object-position).
 */
export function CoverPosition({ tripId, src }: { tripId: string; src: string }) {
  const t = useT();
  const router = useRouter();
  const init = parseCover(src);
  const [x, setX] = useState(init.x);
  const [y, setY] = useState(init.y);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [pending, startTransition] = useTransition();

  // Charge l'image pour connaître ses dimensions naturelles (aspect exact)
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = init.base;
  }, [init.base]);

  const commit = () => {
    startTransition(async () => {
      const res = await setCoverPosition(tripId, x, y);
      setSaved(res.status === "success");
      router.refresh();
    });
  };

  const natAspect = nat ? nat.w / nat.h : BANNER_ASPECT;
  const vertical = natAspect <= BANNER_ASPECT; // rogne en haut/bas (cas courant)
  const cropPct = Math.min(
    100,
    vertical ? (natAspect / BANNER_ASPECT) * 100 : (BANNER_ASPECT / natAspect) * 100,
  );
  const range = 100 - cropPct;
  const pos = vertical ? y : x;
  const startPct = (pos / 100) * range;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!nat || range <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSaved(false);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const rect = box.getBoundingClientRect();
    if (vertical) {
      const dPct = ((e.clientY - d.sy) / rect.height) * 100;
      const begin = (d.oy / 100) * range;
      const ny = range > 0 ? (clamp(begin + dPct, 0, range) / range) * 100 : 50;
      setY(ny);
    } else {
      const dPct = ((e.clientX - d.sx) / rect.width) * 100;
      const begin = (d.ox / 100) * range;
      const nx = range > 0 ? (clamp(begin + dPct, 0, range) / range) * 100 : 50;
      setX(nx);
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-5 py-4">
      <p className="text-sm font-medium text-encre">{t("settings.cover.frameTitle")}</p>
      <p className="text-xs text-encre-douce">{t("settings.cover.frameHint")}</p>
      <div
        ref={boxRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-laiton-clair bg-encre"
        style={{
          aspectRatio: nat ? `${nat.w} / ${nat.h}` : String(BANNER_ASPECT),
          cursor: nat && range > 0 ? "grab" : "default",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        <Image
          src={init.base}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="pointer-events-none object-cover"
        />
        {nat && range > 0.5 ? (
          <>
            {vertical ? (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bg-encre/60"
                  style={{ height: `${startPct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-encre/60"
                  style={{ height: `${range - startPct}%` }}
                />
              </>
            ) : (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-encre/60"
                  style={{ width: `${startPct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 bg-encre/60"
                  style={{ width: `${range - startPct}%` }}
                />
              </>
            )}
            <div
              className="pointer-events-none absolute rounded-sm border-2 border-papier shadow-[0_0_0_1px_rgba(31,42,68,0.4)]"
              style={
                vertical
                  ? { left: 0, right: 0, top: `${startPct}%`, height: `${cropPct}%` }
                  : { top: 0, bottom: 0, left: `${startPct}%`, width: `${cropPct}%` }
              }
            />
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !nat}
          onClick={commit}
        >
          {t("settings.cover.frameSave")}
        </Button>
        {saved ? <p className="text-xs text-encre-douce">{t("settings.cover.done")}</p> : null}
      </div>
    </div>
  );
}
