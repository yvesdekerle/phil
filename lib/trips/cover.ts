/**
 * Cadrage de la couverture (PHIL-Q37c) — la position de recadrage est encodée
 * dans un fragment d'URL (`…jpg#pos=X,Y`, X/Y en 0-100). Le fragment n'est jamais
 * envoyé au serveur d'images (les navigateurs le retirent), donc aucune migration :
 * on stocke tout dans `cover_image_url`.
 */
export function parseCover(src: string): {
  base: string;
  objectPosition?: string;
  x: number;
  y: number;
} {
  const hash = src.indexOf("#pos=");
  if (hash < 0) {
    return { base: src, x: 50, y: 50 };
  }
  const base = src.slice(0, hash);
  const m = /pos=([\d.]+),([\d.]+)/.exec(src.slice(hash + 1));
  if (!m) {
    return { base, x: 50, y: 50 };
  }
  const x = Number(m[1]);
  const y = Number(m[2]);
  return { base, objectPosition: `${x}% ${y}%`, x, y };
}

/** Recompose l'URL de couverture avec la position (X/Y en 0-100). */
export function withCoverPosition(url: string, x: number, y: number): string {
  const base = url.split("#")[0];
  const cx = Math.min(100, Math.max(0, Math.round(x)));
  const cy = Math.min(100, Math.max(0, Math.round(y)));
  return `${base}#pos=${cx},${cy}`;
}
