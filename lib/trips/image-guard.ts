import net from "node:net";

/**
 * Garde SSRF de l'ingestion d'images distantes (PHIL-R09). Logique pure, sans
 * `server-only` ni I/O, pour être testable : `cover-fetch.ts` l'utilise pour
 * bloquer une cible interne avant de télécharger une URL collée par l'utilisateur.
 */

export type ImageExt = "jpg" | "png" | "webp";

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 « ce réseau »
  if (a === 10) return true; // privé
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true; // link-local + metadata cloud 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // privé 172.16/12
  if (a === 192 && b === 168) return true; // privé
  if (a >= 224) return true; // multicast (224/4) + réservé (240/4) + broadcast
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) → valider la partie v4 sous-jacente.
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }
  if (lower === "::1" || lower === "::") return true; // loopback / non spécifiée
  const head = lower.split(":")[0];
  if (head.startsWith("fc") || head.startsWith("fd")) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(head)) return true; // link-local fe80::/10
  if (head.startsWith("ff")) return true; // multicast ff00::/8
  return false;
}

/**
 * Vrai si l'IP tombe dans une plage privée / loopback / link-local / metadata,
 * ou n'est pas une IP reconnue (on bloque par prudence). C'est la dernière
 * barrière contre le SSRF : une URL dont l'hôte résout vers ces plages est refusée.
 */
export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

/**
 * Déduit le type d'image des octets d'en-tête (magic bytes), pas du Content-Type
 * déclaré (falsifiable). Retourne l'extension ou `null` si ce n'est pas une image
 * JPEG/PNG/WebP — ce qui refuse aussi le HTML/SVG servi en `image/*`.
 */
export function sniffImageType(bytes: Uint8Array): ImageExt | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "jpg";
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "png";
  }
  // WebP : conteneur RIFF (« RIFF » … « WEBP »).
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

/** Content-Type de stockage pour une extension d'image validée. */
export function imageContentType(ext: ImageExt): string {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}
