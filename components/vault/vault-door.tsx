"use client";

/**
 * Porte de coffre-fort (PHIL-M01) : deux gravures — porte fermée aux
 * engrenages et barres d'or, porte ouverte sur les coffres — avec fondu
 * croisé. États :
 *  - "closing"  : ouverte → fermée (arrivée sur l'écran verrouillé)
 *  - "idle"     : fermée
 *  - "opening"  : fermée → ouverte (après Touch ID)
 * `prefers-reduced-motion` : image finale sans transition.
 */
export type VaultDoorState = "closing" | "idle" | "opening";

export function VaultDoor({ state }: { state: VaultDoorState }) {
  return (
    <div className={`vault-door-scene vault-${state}`} aria-hidden="true">
      {/* biome-ignore lint/performance/noImgElement: assets locaux fixes */}
      <img src="/vault/porte-fermee.webp" alt="" className="vd-closed" />
      {/* biome-ignore lint/performance/noImgElement: assets locaux fixes */}
      <img src="/vault/porte-ouverte.webp" alt="" className="vd-open" />

      <style>{`
        .vault-door-scene {
          position: relative;
          width: 13rem;
          margin-inline: auto;
          aspect-ratio: 505 / 630;
        }
        .vault-door-scene img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 0.5rem;
          border: 1px solid var(--laiton-clair);
          box-shadow: 0 3px 18px rgba(31, 42, 68, 0.18);
        }

        /* Fermeture : l'ouverte s'efface, la fermée s'impose (léger zoom) */
        .vault-closing .vd-open { animation: vd-fade-out 1s ease-in both; }
        .vault-closing .vd-closed { animation: vd-fade-in 1s ease-in both; }

        /* Repos : porte fermée */
        .vault-idle .vd-open { opacity: 0; }

        /* Ouverture : la fermée s'efface, l'ouverte apparaît */
        .vault-opening .vd-closed { animation: vd-fade-out 1.1s ease-out 0.3s both; }
        .vault-opening .vd-open { animation: vd-fade-in 1.1s ease-out 0.3s both; }

        @keyframes vd-fade-in {
          from { opacity: 0; transform: scale(1.03); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes vd-fade-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.985); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vault-door-scene img { animation: none !important; }
          .vault-closing .vd-open, .vault-idle .vd-open { opacity: 0; }
          .vault-opening .vd-closed { opacity: 0; }
          .vault-opening .vd-open { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
