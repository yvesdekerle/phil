import { extractReservation, importEnabled } from "@/lib/import/reservation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Payload inbound tolérant (Resend inbound / Cloudflare Email Worker). */
type InboundPayload = {
  from?: string | { email?: string; address?: string };
  to?: string | string[] | { email?: string }[];
  subject?: string;
  text?: string;
  html?: string;
  attachments?: {
    filename?: string;
    content?: string;
    contentType?: string;
    content_type?: string;
  }[];
};

function senderOf(p: InboundPayload): string | null {
  if (typeof p.from === "string") {
    const m = p.from.match(/<([^>]+)>/);
    return (m ? m[1] : p.from).trim().toLowerCase();
  }
  return (p.from?.email ?? p.from?.address ?? null)?.toLowerCase() ?? null;
}

function aliasOf(p: InboundPayload): string | null {
  const list = Array.isArray(p.to) ? p.to : p.to ? [p.to] : [];
  for (const entry of list) {
    const addr = typeof entry === "string" ? entry : (entry.email ?? "");
    const m = addr.toLowerCase().match(/([a-z0-9-]{4,40})@/);
    if (m) {
      return m[1];
    }
  }
  return null;
}

/**
 * Webhook d'emails entrants (PHIL-P02) : une confirmation transférée à
 * l'alias du voyage devient un brouillon "à valider" — jamais un événement
 * silencieux. Sécurité : secret partagé + expéditeur = email d'un
 * participant du voyage.
 * Réception effective quand un domaine (MX Resend inbound ou Cloudflare
 * Email Routing) pointera vers cette route.
 */
export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  const provided = new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!importEnabled()) {
    return Response.json({ error: "GEMINI_API_KEY non configurée" }, { status: 503 });
  }

  const payload = (await request.json()) as InboundPayload;
  const sender = senderOf(payload);
  const alias = aliasOf(payload);
  if (!sender || !alias) {
    return Response.json({ error: "Expéditeur ou destinataire illisible" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, name")
    .eq("email_alias", alias)
    .single();
  if (!trip) {
    return Response.json({ error: "Alias inconnu" }, { status: 404 });
  }

  // L'expéditeur doit être un participant du voyage (email côté auth.users)
  const { data: participants } = await admin
    .from("trip_participants")
    .select("user_id")
    .eq("trip_id", trip.id);
  let isMember = false;
  for (const p of participants ?? []) {
    const { data } = await admin.auth.admin.getUserById(p.user_id);
    if (data.user?.email?.toLowerCase() === sender) {
      isMember = true;
      break;
    }
  }
  if (!isMember) {
    // même réponse qu'un alias inconnu : ne pas confirmer l'existence du voyage
    return Response.json({ error: "Alias inconnu" }, { status: 404 });
  }

  // Première pièce jointe exploitable (≤ 8 Mo), sinon le texte de l'email
  const attachment = (payload.attachments ?? []).find((a) => {
    const type = a.contentType ?? a.content_type ?? "";
    return a.content && ALLOWED_MIMES.includes(type);
  });
  let bytes: Uint8Array | null = null;
  let mimeType = "";
  if (attachment?.content) {
    bytes = new Uint8Array(Buffer.from(attachment.content, "base64"));
    mimeType = attachment.contentType ?? attachment.content_type ?? "application/pdf";
    if (bytes.byteLength > 8 * 1024 * 1024) {
      bytes = null;
    }
  }
  const emailText = payload.text ?? payload.html?.replace(/<[^>]+>/g, " ") ?? "";
  if (!bytes && !emailText.trim()) {
    return Response.json({ error: "Email vide" }, { status: 400 });
  }

  const extracted = await extractReservation(
    bytes ? [{ bytes, mimeType }] : [],
    emailText || undefined,
  );
  if (!extracted) {
    return Response.json({ error: "Extraction impossible" }, { status: 422 });
  }

  // Pièce jointe conservée pour devenir le document du voyage à la validation
  const draftId = crypto.randomUUID();
  let storagePath: string | null = null;
  if (bytes) {
    const ext = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
    storagePath = `inbound/${trip.id}/${draftId}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: mimeType });
    if (upErr) {
      storagePath = null;
    }
  }

  const { error } = await admin.from("import_drafts").insert({
    id: draftId,
    trip_id: trip.id,
    sender,
    subject: payload.subject ?? null,
    extracted,
    storage_path: storagePath,
    file_name: attachment?.filename ?? null,
    mime_type: bytes ? mimeType : null,
    size_bytes: bytes ? bytes.byteLength : null,
  });
  if (error) {
    return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
  }

  return Response.json({ draft: draftId, trip: trip.name });
}
