import { z } from "zod";
import { TRANSPORT_MODES } from "@/lib/events/transport";

/**
 * Extraction de confirmation de réservation (PHIL-O01) — Gemini Flash via
 * clé Google AI Studio (free tier, multimodal PDF/images). Caveat documenté :
 * sur le free tier, Google peut utiliser les données envoyées pour améliorer
 * ses modèles — on n'envoie que des confirmations de voyage, jamais un
 * document du coffre. Sans clé, la fonctionnalité est simplement désactivée.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const extractedSchema = z.object({
  kind: z.enum(["TRANSPORT", "LODGING", "ACTIVITY"]).catch("ACTIVITY"),
  title: z.string().trim().min(1).max(150).catch("Réservation importée"),
  startsAtLocal: z.string().regex(DATETIME_LOCAL).nullable().catch(null),
  endsAtLocal: z.string().regex(DATETIME_LOCAL).nullable().catch(null),
  timezone: z.string().nullable().catch(null),
  locationName: z.string().max(150).nullable().catch(null),
  locationAddress: z.string().max(300).nullable().catch(null),
  from: z.string().max(120).nullable().catch(null),
  to: z.string().max(120).nullable().catch(null),
  transportMode: z.enum(TRANSPORT_MODES).nullable().catch(null),
  carrier: z.string().max(120).nullable().catch(null),
  bookingReference: z.string().max(100).nullable().catch(null),
  notes: z.string().max(2000).nullable().catch(null),
});

export type ExtractedReservation = z.infer<typeof extractedSchema>;

export function importEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const PROMPT = `Tu lis une confirmation de réservation de voyage (vol, train, hôtel, location, activité).
Extrais les informations en JSON strict avec exactement ces clés :
{
  "kind": "TRANSPORT" | "LODGING" | "ACTIVITY",
  "title": "titre court et parlant (ex: 'Vol AF 462 Paris → Maurice', 'Hôtel Le Récif')",
  "startsAtLocal": "YYYY-MM-DDTHH:MM en HEURE LOCALE du lieu de départ/check-in, ou null",
  "endsAtLocal": "YYYY-MM-DDTHH:MM en heure locale de l'arrivée/check-out, ou null",
  "timezone": "fuseau IANA du départ (ex: 'Europe/Paris'), ou null si incertain",
  "locationName": "nom du lieu (hôtel, gare, aéroport), ou null",
  "locationAddress": "adresse postale complète si présente, ou null",
  "from": "lieu de départ (TRANSPORT uniquement), ou null",
  "to": "lieu d'arrivée (TRANSPORT uniquement), ou null",
  "transportMode": "plane" | "train" | "bus" | "car" | "ferry" | "other" | null,
  "carrier": "compagnie/transporteur/plateforme, ou null",
  "bookingReference": "référence de réservation, ou null",
  "notes": "détails utiles (terminal, siège, conditions d'annulation…), ou null"
}
Pour un hébergement (LODGING) : from, to et transportMode restent null.
Ne devine jamais une date absente : mets null. Réponds uniquement le JSON.`;

/**
 * Analyse un ou plusieurs fichiers (PDF/images) — et/ou le texte d'un email
 * (PHIL-P02) — et renvoie les champs extraits.
 */
export async function extractReservation(
  files: { bytes: Uint8Array; mimeType: string }[],
  emailText?: string,
): Promise<ExtractedReservation | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const parts: unknown[] = files.map((f) => ({
    inline_data: { mime_type: f.mimeType, data: Buffer.from(f.bytes).toString("base64") },
  }));
  if (emailText?.trim()) {
    parts.push({ text: `Contenu de l'email :\n${emailText.slice(0, 20_000)}` });
  }
  parts.push({ text: PROMPT });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { response_mime_type: "application/json", temperature: 0 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!r.ok) {
      console.error(`[import] Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return null;
    }
    const json = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return null;
    }
    const parsed = extractedSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.error("[import] extraction échouée:", e);
    return null;
  }
}
