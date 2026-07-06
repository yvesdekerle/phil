"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Couverture de voyage avec repli gracieux (PHIL-Q37c). Les URL sont libres
 * (saisies par l'utilisateur) : si l'image casse — lien mort, hôte lent,
 * optimiseur qui flanche — on affiche l'initiale de la destination plutôt
 * qu'une icône d'image brisée.
 */
export function CoverImage({
  src,
  sizes,
  className,
  fallbackChar,
  fallbackClassName = "font-display text-4xl text-laiton italic",
  priority,
}: {
  src: string;
  sizes?: string;
  className?: string;
  fallbackChar: string;
  fallbackClassName?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className={fallbackClassName}>{fallbackChar}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
