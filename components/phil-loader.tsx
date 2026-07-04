"use client";

/**
 * Loader Jules Verne (PHIL-M02) : la montgolfière gravée traverse le
 * parchemin en se balançant, au-dessus d'une barre de progression en
 * rectangles bordeaux qui s'accumulent puis repartent ensemble.
 * `prefers-reduced-motion` : image immobile, barre pleine.
 */

const SEGMENTS = 8;

// Chaque rectangle a ses propres keyframes : il s'allume à son tour
// (accumulation), puis tous s'éteignent en même temps en fin de cycle.
const SEGMENT_KEYFRAMES = Array.from({ length: SEGMENTS }, (_, i) => {
  const lightAt = 6 + i * 9; // 6%, 15%, 24%, … 69%
  return `
        @keyframes pl-seg-${i} {
          0%, ${lightAt - 1}% { opacity: 0.14; }
          ${lightAt}% { opacity: 1; }
          84% { opacity: 1; }
          92%, 100% { opacity: 0.14; }
        }`;
}).join("\n");

export type PhilLoaderScene = "balloon";

export function PhilLoader(_props: { scene?: PhilLoaderScene }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="phil-loader flex h-52 w-80 items-center justify-center" aria-hidden="true">
        <div className="pl-track">
          <div className="pl-bob">
            {/* biome-ignore lint/performance/noImgElement: asset local fixe */}
            <img src="/loaders/montgolfiere.webp" alt="" className="pl-sway h-52 w-auto" />
          </div>
        </div>
      </div>

      <div className="pl-bar flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: liste statique purement décorative
            key={i}
            style={{ animationName: `pl-seg-${i}` }}
          />
        ))}
      </div>

      <p role="status" className="font-display text-lg text-encre-douce italic">
        Phil prend de l'altitude…
      </p>

      <style>{`
        /* Montgolfière : traverse en montant/descendant et en se balançant */
        .pl-track { animation: pl-cross 9s ease-in-out infinite alternate; }
        .pl-bob { animation: pl-bob 3s ease-in-out infinite; }
        .pl-sway { animation: pl-sway 3.6s ease-in-out infinite; transform-origin: 50% 12%; }

        /* Barre : rectangles au rouge exact du ballon, qui s'accumulent */
        .pl-bar span {
          width: 14px;
          height: 8px;
          border-radius: 2px;
          background: #953c32;
          opacity: 0.14;
          animation-duration: 3.2s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
${SEGMENT_KEYFRAMES}

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
          .phil-loader *, .pl-bar span { animation: none !important; }
          .pl-bar span { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
