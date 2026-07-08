"use client";

import Image from "next/image";
import { useState } from "react";
import { parseCover } from "@/lib/trips/cover";
import { cn } from "@/lib/utils";

/**
 * Couverture de voyage avec repli gracieux (PHIL-Q37c). Les URL sont libres
 * (saisies par l'utilisateur) : si l'image casse — lien mort, hôte lent,
 * optimiseur qui flanche — on affiche l'initiale de la destination plutôt
 * qu'une icône d'image brisée.
 *
 * PHIL-R09 : l'optimiseur `next/image` n'accepte qu'une allowlist d'hôtes
 * (Supabase + avatars Google), les couvertures étant censées vivre dans notre
 * bucket. Un `cover_image_url` externe (legacy, ou téléchargement bucket qui a
 * échoué) ferait **crasher le rendu** (`next/image` lève « hostname not
 * configured » avant même que `onError` ne s'active). On route donc ces URL vers
 * une balise `<img>` ordinaire : chargée côté client (aucun proxy serveur → pas
 * de SSRF), autorisée par la CSP `img-src https:`, avec le même repli à l'erreur.
 */

const OPTIMIZED_HOSTS = new Set<string>(["lh3.googleusercontent.com"]);
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    OPTIMIZED_HOSTS.add(new URL(supabaseUrl).hostname);
  }
} catch {
  // URL Supabase absente/invalide : on garde juste l'hôte des avatars Google.
}

/** L'URL peut-elle passer par l'optimiseur `next/image` (hôte de l'allowlist) ? */
function canOptimize(url: string): boolean {
  if (url.startsWith("/")) {
    return true;
  }
  try {
    return OPTIMIZED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

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
  const { base, objectPosition } = parseCover(src);
  const positionStyle = objectPosition ? { objectPosition } : undefined;

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className={fallbackClassName}>{fallbackChar}</span>
      </div>
    );
  }

  if (!canOptimize(base)) {
    // Hôte hors allowlist : image ordinaire (non optimisée), jamais de crash.
    return (
      // biome-ignore lint/performance/noImgElement: URL externe hors optimiseur (PHIL-R09), chargée côté client sans proxy serveur
      <img
        src={base}
        alt=""
        className={cn("absolute inset-0 size-full", className)}
        style={positionStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={base}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={positionStyle}
      onError={() => setFailed(true)}
    />
  );
}
