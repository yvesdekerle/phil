"use client";

import { useEffect, useState } from "react";

/**
 * Loaders Jules Verne (PHIL-M02) : deux planches gravées tirées au sort —
 * la montgolfière (fond blanc fondu dans le parchemin via mix-blend-mode)
 * et le globe de l'explorateur. Tirage au mount (côté client uniquement :
 * pas de mismatch d'hydratation). `prefers-reduced-motion` : image immobile.
 */

const SCENES = ["balloon", "globe"] as const;
export type PhilLoaderScene = (typeof SCENES)[number];
type Scene = PhilLoaderScene;

const CAPTIONS: Record<Scene, string> = {
  balloon: "Phil prend de l'altitude…",
  globe: "Phil trace la route sur le globe…",
};

export function PhilLoader({ scene: forcedScene }: { scene?: PhilLoaderScene }) {
  const [scene, setScene] = useState<Scene | null>(forcedScene ?? null);

  useEffect(() => {
    if (!forcedScene) {
      setScene(SCENES[Math.floor(Math.random() * SCENES.length)]);
    }
  }, [forcedScene]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16">
      <div className="phil-loader flex h-52 w-80 items-center justify-center" aria-hidden="true">
        {scene === "balloon" ? (
          <div className="pl-track">
            <div className="pl-bob">
              {/* biome-ignore lint/performance/noImgElement: asset local fixe, pas d'optimisation nécessaire */}
              <img src="/loaders/montgolfiere.webp" alt="" className="pl-sway h-52 w-auto" />
            </div>
          </div>
        ) : null}
        {scene === "globe" ? (
          // biome-ignore lint/performance/noImgElement: asset local fixe
          <img
            src="/loaders/globe.webp"
            alt=""
            className="h-52 w-auto rounded-md border border-laiton-clair shadow-[0_3px_18px_rgba(31,42,68,0.18)]"
          />
        ) : null}
      </div>
      {scene === "globe" ? (
        <div className="pl-dots flex items-center gap-2" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      <p role="status" className="font-display text-lg text-encre-douce italic">
        {scene ? CAPTIONS[scene] : "Phil prépare le départ…"}
      </p>

      <style>{`
        /* Montgolfière : traverse en montant/descendant et en se balançant */
        .pl-track { animation: pl-cross 9s ease-in-out infinite alternate; }
        .pl-bob { animation: pl-bob 3s ease-in-out infinite; }
        .pl-sway { animation: pl-sway 3.6s ease-in-out infinite; transform-origin: 50% 12%; }

        /* Globe : planche immobile, indicateur de chargement en dessous */
        .pl-dots span {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #a98a54;
          animation: pl-dot 1.3s ease-in-out infinite;
        }
        .pl-dots span:nth-child(2) { animation-delay: 0.18s; }
        .pl-dots span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes pl-dot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }

        @keyframes pl-cross {
          from { transform: translateX(-46px); }
          to { transform: translateX(46px); }
        }
        @keyframes pl-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pl-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .phil-loader * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
