import "server-only";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/observability/logger";
import { type ImageExt, imageContentType, isBlockedIp, sniffImageType } from "./image-guard";

/**
 * Ingestion d'une image de couverture collée par URL (PHIL-R09).
 *
 * Plutôt que de stocker l'URL distante brute (ce qui forçait l'optimiseur
 * d'images de Next à aller la chercher côté serveur — SSRF aveugle via
 * `remotePatterns: "**"`), on télécharge l'image **une fois**, sous garde
 * anti-SSRF, on vérifie que c'en est bien une (magic bytes), et on la sert
 * ensuite depuis notre propre bucket `covers`. `remotePatterns` peut alors
 * être verrouillé à Supabase + Google.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

export type CoverFetchError =
  | "invalid_url"
  | "blocked_host"
  | "redirect"
  | "not_image"
  | "too_large"
  | "fetch_failed";

type FetchResult =
  | { ok: true; bytes: Uint8Array; ext: ImageExt }
  | { ok: false; error: CoverFetchError };

/** Télécharge et valide une image distante sous garde anti-SSRF. */
async function fetchRemoteImage(rawUrl: string): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "invalid_url" };
  }

  // Garde SSRF : résoudre l'hôte et refuser toute IP interne AVANT le fetch.
  try {
    const addrs = await lookup(url.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
      return { ok: false, error: "blocked_host" };
    }
  } catch {
    return { ok: false, error: "blocked_host" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      // Pas de suivi de redirection : une 3xx pourrait rebondir vers une cible
      // interne après le contrôle DNS (bypass SSRF classique).
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/*" },
    });
  } catch {
    return { ok: false, error: "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }

  if (res.status >= 300 && res.status < 400) {
    return { ok: false, error: "redirect" };
  }
  if (!res.ok) {
    return { ok: false, error: "fetch_failed" };
  }

  const declared = Number(res.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const ext = sniffImageType(bytes);
  if (!ext) {
    return { ok: false, error: "not_image" };
  }
  return { ok: true, bytes, ext };
}

/**
 * Télécharge l'URL collée et la range dans `covers/{tripId}/{uuid}.{ext}`,
 * puis retourne l'URL publique de NOTRE bucket. L'upload passe par le client
 * de session fourni (mêmes droits que l'upload direct — pas d'escalade).
 */
export async function ingestCoverUrl(
  // biome-ignore lint/suspicious/noExplicitAny: client Supabase typé côté appelant
  supabase: SupabaseClient<any, any, any>,
  tripId: string,
  rawUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: CoverFetchError }> {
  const fetched = await fetchRemoteImage(rawUrl);
  if (!fetched.ok) {
    return fetched;
  }

  const { bytes, ext } = fetched;
  const path = `${tripId}/${randomUUID()}.${ext}`;
  // Buffer (Node) plutôt que Blob : évite la friction de typage TypedArray/DOM
  // côté server-only et reste un corps d'upload valide pour supabase-js.
  const { error } = await supabase.storage.from("covers").upload(path, Buffer.from(bytes), {
    contentType: imageContentType(ext),
    upsert: false,
  });
  if (error) {
    logger.error("cover_ingest_upload_failed", { tripId });
    return { ok: false, error: "fetch_failed" };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return { ok: true, url: `${base}/storage/v1/object/public/covers/${path}` };
}
