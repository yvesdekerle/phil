/**
 * Quotas photos (PHIL-O10) — Supabase Free = 1 Go de storage pour toute
 * l'app (documents compris). On garde la qualité d'origine et on limite le
 * nombre : ~40 photos × ~3-4 Mo ≈ 150 Mo par voyage.
 */
export const PHOTOS_PER_TRIP = 40;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // aligné sur le bucket

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function photoExtension(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
  return `${Math.round(bytes / 1024)} Ko`;
}
