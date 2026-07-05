import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting (PHIL-Q44) — s'appuie sur Upstash Redis. **Dégrade proprement** :
 * tant que `UPSTASH_REDIS_REST_URL`/`_TOKEN` ne sont pas configurés, la fonction
 * autorise tout (inerte). Une fois les variables posées, la protection s'active
 * sans changement de code.
 *
 * NB : le modèle d'auth de Phil (Google OAuth + tokens UUID de 122 bits) limite
 * déjà la surface brute-force ; ce garde-fou couvre surtout les abus sur les
 * endpoints non authentifiés (webhook si le secret fuite, scraping).
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<string, Ratelimit>();

function limiter(name: string, limit: number, windowSec: number): Ratelimit | null {
  if (!redis) {
    return null;
  }
  const key = `${name}:${limit}:${windowSec}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `phil:rl:${name}`,
    });
    limiters.set(key, l);
  }
  return l;
}

/**
 * Renvoie `true` si la requête est autorisée, `false` si le quota est dépassé.
 * Inerte (toujours `true`) tant qu'Upstash n'est pas configuré.
 */
export async function rateLimitOk(
  name: string,
  identifier: string,
  opts: { limit: number; windowSec: number },
): Promise<boolean> {
  const l = limiter(name, opts.limit, opts.windowSec);
  if (!l) {
    return true;
  }
  const { success } = await l.limit(identifier);
  return success;
}

/** Identifiant client best-effort (IP) pour le rate limiting. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
