"use client";

/**
 * Porte de coffre-fort de banque ancienne (PHIL-M01) : ronde, roue à
 * branches laiton, rivets. Trois états :
 *  - "closing"  : la porte se referme puis la roue tourne (arrivée sur l'écran)
 *  - "idle"     : porte fermée
 *  - "opening"  : la roue tourne (sens inverse) puis la porte pivote et s'ouvre
 * `prefers-reduced-motion` : aucun mouvement.
 */
export type VaultDoorState = "closing" | "idle" | "opening";

export function VaultDoor({ state }: { state: VaultDoorState }) {
  return (
    <div className={`vault-scene vault-${state}`} aria-hidden="true">
      <div className="vault-frame">
        {/* Intérieur du coffre, révélé à l'ouverture */}
        <div className="vault-interior" />
        <div className="vault-door">
          <svg viewBox="0 0 120 120" className="size-full" role="presentation">
            {/* Porte */}
            <circle cx="60" cy="60" r="58" fill="#2a3350" stroke="#1f2a44" strokeWidth="3" />
            <circle cx="60" cy="60" r="50" fill="#39456b" />
            {/* Rivets — coordonnées figées (l'arrondi flottant de Math.sin
                diffère entre serveur et client → mismatch d'hydratation) */}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              const cx = (60 + 54 * Math.cos(a)).toFixed(2);
              const cy = (60 + 54 * Math.sin(a)).toFixed(2);
              return <circle key={cx + cy} cx={cx} cy={cy} r="1.8" fill="#d9c9a3" />;
            })}
            {/* Charnières */}
            <rect x="2" y="38" width="7" height="12" rx="2" fill="#a98a54" />
            <rect x="2" y="70" width="7" height="12" rx="2" fill="#a98a54" />
            {/* Roue (animée) */}
            <g className="vault-wheel">
              <circle cx="60" cy="60" r="28" fill="none" stroke="#a98a54" strokeWidth="5" />
              {[0, 60, 120].map((deg) => (
                <rect
                  key={deg}
                  x="57.5"
                  y="30"
                  width="5"
                  height="60"
                  rx="2.5"
                  fill="#d9c9a3"
                  transform={`rotate(${deg} 60 60)`}
                />
              ))}
              <circle cx="60" cy="60" r="9" fill="#a98a54" stroke="#d9c9a3" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>

      <style>{`
        .vault-scene {
          width: 8.5rem;
          height: 8.5rem;
          margin-inline: auto;
          perspective: 480px;
        }
        .vault-frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: #171f33;
          box-shadow: inset 0 0 0 4px #a98a54;
        }
        .vault-interior {
          position: absolute;
          inset: 8%;
          border-radius: 9999px;
          background:
            radial-gradient(circle at 35% 30%, #d9c9a3 0 12%, transparent 13%),
            radial-gradient(circle at 65% 55%, #d9c9a3 0 9%, transparent 10%),
            #10182b;
        }
        .vault-door {
          position: absolute;
          inset: 0;
          transform-origin: 6% 50%;
          transform-style: preserve-3d;
        }
        .vault-wheel {
          transform-origin: 60px 60px;
        }

        /* Fermeture : porte se rabat, PUIS la roue tourne pour verrouiller */
        .vault-closing .vault-door {
          animation: vault-door-close 0.7s ease-in both;
        }
        .vault-closing .vault-wheel {
          animation: vault-wheel-lock 0.9s ease-in-out 0.75s both;
        }

        /* Ouverture : roue d'abord (sens inverse), PUIS la porte pivote */
        .vault-opening .vault-wheel {
          animation: vault-wheel-unlock 0.9s ease-in-out both;
        }
        .vault-opening .vault-door {
          animation: vault-door-open 0.8s ease-in 0.95s both;
        }

        @keyframes vault-door-close {
          from { transform: rotateY(-75deg); }
          to { transform: rotateY(0deg); }
        }
        @keyframes vault-door-open {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(-75deg); }
        }
        @keyframes vault-wheel-lock {
          from { transform: rotate(-180deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes vault-wheel-unlock {
          from { transform: rotate(0deg); }
          to { transform: rotate(-180deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vault-door, .vault-wheel {
            animation: none !important;
          }
          .vault-opening .vault-door {
            transform: rotateY(-75deg);
          }
        }
      `}</style>
    </div>
  );
}
