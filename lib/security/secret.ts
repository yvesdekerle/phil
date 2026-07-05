import { timingSafeEqual } from "node:crypto";

/**
 * Comparaison de secrets en temps constant (PHIL-Q43) — évite la fuite par
 * timing d'un `===`/`!==` naïf. Longueurs différentes → false immédiat, mais
 * la comparaison des octets reste constante pour une longueur donnée.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Vérifie un en-tête `Authorization: Bearer <secret>` en temps constant.
 * Renvoie false si le secret d'environnement est absent (fail-closed).
 */
export function checkBearer(request: Request, expected: string | undefined): boolean {
  if (!expected) {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return timingSafeEqualStr(token, expected);
}
