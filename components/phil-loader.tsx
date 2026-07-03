"use client";

import { useEffect, useState } from "react";

/**
 * Loaders Jules Verne (PHIL-M02) : une scène tirée au sort parmi
 * montgolfière, éléphant, bateau à vapeur et Nautilus. Tirage au mount
 * (côté client uniquement : pas de mismatch d'hydratation).
 * `prefers-reduced-motion` : scène immobile.
 */

const SCENES = ["balloon", "elephant", "steamer", "nautilus"] as const;
type Scene = (typeof SCENES)[number];

const CAPTIONS: Record<Scene, string> = {
  balloon: "Phil prend de l'altitude…",
  elephant: "Phil traverse l'Inde à dos d'éléphant…",
  steamer: "Phil fait route à toute vapeur…",
  nautilus: "Phil explore vingt mille lieues…",
};

export function PhilLoader() {
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    setScene(SCENES[Math.floor(Math.random() * SCENES.length)]);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="phil-loader h-28 w-64" aria-hidden="true">
        {scene === "balloon" ? <Balloon /> : null}
        {scene === "elephant" ? <Elephant /> : null}
        {scene === "steamer" ? <Steamer /> : null}
        {scene === "nautilus" ? <Nautilus /> : null}
      </div>
      <p role="status" className="font-display text-lg text-encre-douce italic">
        {scene ? CAPTIONS[scene] : "Phil prépare le départ…"}
      </p>

      <style>{`
        .phil-loader svg { width: 100%; height: 100%; overflow: visible; }

        /* Montgolfière : traverse en montant/descendant et en se balançant */
        .pl-balloon-track { animation: pl-cross 7s linear infinite; }
        .pl-balloon-bob { animation: pl-bob 2.6s ease-in-out infinite; }
        .pl-balloon-sway { animation: pl-sway 3.2s ease-in-out infinite; transform-origin: 50% 15%; }

        /* Éléphant : marche (pattes alternées, corps qui tangue) */
        .pl-elephant-walk { animation: pl-bob 1.6s ease-in-out infinite; }
        .pl-leg-a { animation: pl-leg 0.8s ease-in-out infinite; transform-origin: top center; }
        .pl-leg-b { animation: pl-leg 0.8s ease-in-out infinite 0.4s; transform-origin: top center; }
        .pl-trunk { animation: pl-sway 2.4s ease-in-out infinite; transform-origin: 20% 10%; }

        /* Vapeur : le bateau tangue, les vagues défilent, la fumée monte */
        .pl-boat { animation: pl-rock 3s ease-in-out infinite; transform-origin: 50% 80%; }
        .pl-waves-front { animation: pl-waves 2.4s linear infinite; }
        .pl-waves-back { animation: pl-waves 3.6s linear infinite reverse; }
        .pl-smoke { animation: pl-smoke 2.2s ease-out infinite; opacity: 0; }
        .pl-smoke-2 { animation-delay: 0.7s; }
        .pl-smoke-3 { animation-delay: 1.4s; }

        /* Nautilus : glisse, hélice qui tourne, bulles qui montent */
        .pl-sub { animation: pl-bob 3.4s ease-in-out infinite; }
        .pl-prop { animation: pl-spin 0.5s linear infinite; transform-origin: 236px 60px; }
        .pl-bubble { animation: pl-bubble 2.4s ease-in infinite; opacity: 0; }
        .pl-bubble-2 { animation-delay: 0.8s; }
        .pl-bubble-3 { animation-delay: 1.6s; }

        @keyframes pl-cross {
          from { transform: translateX(-70px); }
          to { transform: translateX(70px); }
        }
        @keyframes pl-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @keyframes pl-sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes pl-leg {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes pl-rock {
          0%, 100% { transform: rotate(-2.5deg) translateY(0); }
          50% { transform: rotate(2.5deg) translateY(-4px); }
        }
        @keyframes pl-waves {
          from { transform: translateX(0); }
          to { transform: translateX(-28px); }
        }
        @keyframes pl-smoke {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translate(10px, -26px) scale(1.4); opacity: 0; }
        }
        @keyframes pl-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pl-bubble {
          0% { transform: translate(0, 0); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: translate(6px, -34px); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .phil-loader * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* Montgolfière rouge et blanche, nacelle en osier (Cinq semaines en ballon) */
function Balloon() {
  return (
    <svg viewBox="0 0 260 120" role="presentation">
      <g className="pl-balloon-track">
        <g className="pl-balloon-bob">
          <g className="pl-balloon-sway">
            {/* Enveloppe : quartiers rouges et blancs */}
            <ellipse
              cx="130"
              cy="38"
              rx="30"
              ry="34"
              fill="#fbf8f1"
              stroke="#6e1f2e"
              strokeWidth="1.5"
            />
            <path d="M130 4 A30 34 0 0 1 130 72 A12 34 0 0 0 130 4" fill="#6e1f2e" />
            <path d="M130 4 A30 34 0 0 0 130 72 A12 34 0 0 1 130 4" fill="#6e1f2e" opacity="0.85" />
            <path d="M130 4 A4.5 34 0 0 0 130 72 A4.5 34 0 0 0 130 4" fill="#fbf8f1" />
            {/* Cordes */}
            <path d="M112 62 L122 88 M148 62 L138 88" stroke="#5a6379" strokeWidth="1.2" />
            {/* Nacelle en osier */}
            <rect
              x="119"
              y="88"
              width="22"
              height="14"
              rx="3"
              fill="#a98a54"
              stroke="#571723"
              strokeWidth="1"
            />
            <path
              d="M119 93 h22 M119 98 h22 M126 88 v14 M133 88 v14"
              stroke="#571723"
              strokeWidth="0.7"
              opacity="0.6"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

/* Éléphant en marche (la traversée de l'Inde de Phileas) */
function Elephant() {
  return (
    <svg viewBox="0 0 260 120" role="presentation">
      <g className="pl-elephant-walk">
        {/* Pattes (derrière le corps) */}
        <g className="pl-leg-a">
          <rect x="102" y="78" width="11" height="30" rx="5" fill="#4a5470" />
        </g>
        <g className="pl-leg-b">
          <rect x="122" y="78" width="11" height="30" rx="5" fill="#5a6379" />
        </g>
        <g className="pl-leg-b">
          <rect x="146" y="78" width="11" height="30" rx="5" fill="#4a5470" />
        </g>
        <g className="pl-leg-a">
          <rect x="164" y="78" width="11" height="30" rx="5" fill="#5a6379" />
        </g>
        {/* Corps */}
        <ellipse cx="140" cy="62" rx="46" ry="30" fill="#5a6379" />
        {/* Tête + oreille */}
        <circle cx="185" cy="48" r="20" fill="#5a6379" />
        <ellipse cx="176" cy="48" rx="10" ry="14" fill="#4a5470" />
        {/* Trompe */}
        <g className="pl-trunk">
          <path
            d="M200 44 q14 8 10 26 q-2 9 -9 10"
            fill="none"
            stroke="#5a6379"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
        {/* Œil + défense */}
        <circle cx="190" cy="42" r="2" fill="#1f2a44" />
        <path
          d="M196 58 q6 5 12 4"
          fill="none"
          stroke="#f4eee1"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Tapis de selle, clin d'œil au maharadjah */}
        <path d="M116 40 q24 -14 48 0 l-4 18 q-20 -8 -40 0 z" fill="#6e1f2e" />
        <path d="M118 52 h44" stroke="#a98a54" strokeWidth="2" />
      </g>
    </svg>
  );
}

/* Bateau à vapeur sur les vagues (le Mongolia / l'Henrietta) */
function Steamer() {
  return (
    <svg viewBox="0 0 260 120" role="presentation">
      {/* Fumée */}
      <circle className="pl-smoke" cx="150" cy="30" r="6" fill="#5a6379" />
      <circle className="pl-smoke pl-smoke-2" cx="150" cy="30" r="7" fill="#5a6379" />
      <circle className="pl-smoke pl-smoke-3" cx="150" cy="30" r="5" fill="#5a6379" />
      <g className="pl-boat">
        {/* Coque */}
        <path d="M85 78 L175 78 L163 96 L97 96 Z" fill="#1f2a44" />
        <path d="M85 78 L175 78 L171 84 L89 84 Z" fill="#6e1f2e" />
        {/* Cabine + cheminée */}
        <rect
          x="115"
          y="60"
          width="34"
          height="18"
          rx="2"
          fill="#fbf8f1"
          stroke="#1f2a44"
          strokeWidth="1.5"
        />
        <rect
          x="143"
          y="34"
          width="10"
          height="26"
          rx="2"
          fill="#6e1f2e"
          stroke="#571723"
          strokeWidth="1"
        />
        <rect x="143" y="34" width="10" height="5" fill="#a98a54" />
        {/* Mât */}
        <path d="M104 78 V48 M104 48 l16 6 -16 6" stroke="#571723" strokeWidth="2" fill="none" />
      </g>
      {/* Vagues (deux plans) */}
      <g className="pl-waves-back" opacity="0.5">
        <path
          d="M40 98 q7 -7 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
          fill="none"
          stroke="#5a6379"
          strokeWidth="3"
        />
      </g>
      <g className="pl-waves-front">
        <path
          d="M30 104 q7 -8 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
          fill="none"
          stroke="#1f2a44"
          strokeWidth="3.5"
        />
      </g>
    </svg>
  );
}

/* Sous-marin façon Nautilus (Vingt mille lieues sous les mers) */
function Nautilus() {
  return (
    <svg viewBox="0 0 260 120" role="presentation">
      {/* Bulles */}
      <circle className="pl-bubble" cx="242" cy="52" r="3" fill="#5a6379" />
      <circle className="pl-bubble pl-bubble-2" cx="246" cy="58" r="2.2" fill="#5a6379" />
      <circle className="pl-bubble pl-bubble-3" cx="240" cy="64" r="2.6" fill="#5a6379" />
      <g className="pl-sub">
        {/* Coque */}
        <ellipse cx="150" cy="60" rx="72" ry="26" fill="#1f2a44" />
        <ellipse cx="150" cy="52" rx="72" ry="18" fill="#2a3350" />
        {/* Éperon (l'avant du Nautilus) */}
        <path d="M78 60 L58 54 L58 66 Z" fill="#571723" />
        {/* Kiosque */}
        <path d="M132 34 h30 l-5 -12 h-20 Z" fill="#6e1f2e" stroke="#571723" strokeWidth="1" />
        <rect x="139" y="26" width="14" height="4" rx="2" fill="#a98a54" />
        {/* Hublots */}
        {[112, 138, 164, 190].map((x) => (
          <g key={x}>
            <circle cx={x} cy="60" r="7" fill="#a98a54" />
            <circle cx={x} cy="60" r="4.5" fill="#d9c9a3" />
          </g>
        ))}
        {/* Hélice */}
        <g className="pl-prop">
          <ellipse cx="236" cy="52" rx="4" ry="10" fill="#a98a54" />
          <ellipse cx="236" cy="68" rx="4" ry="10" fill="#a98a54" transform="rotate(180 236 60)" />
          <circle cx="236" cy="60" r="3.5" fill="#571723" />
        </g>
      </g>
    </svg>
  );
}
