import { createResendClient, fromEmail } from "@/lib/email/resend";
import { DocumentExpiryEmail } from "@/lib/email/templates/document-expiry";
import { parsePreferences } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_LABELS } from "@/lib/vault/categories";

export const dynamic = "force-dynamic";

/** Seuils d'alerte avant expiration (PHIL-E07). */
const THRESHOLD_DAYS = [180, 90, 30, 7];

/**
 * Cron quotidien (Vercel Cron, 6h UTC) : alerte les propriétaires dont un
 * document expire exactement à J-180/90/30/7 — une alerte par seuil, sans
 * table d'état. Respecte la préférence `expiry_alerts` (PHIL-K04).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date();
  const results: { document: string; days: number; sent: boolean; reason?: string }[] = [];

  for (const days of THRESHOLD_DAYS) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + days);
    const targetDate = target.toISOString().slice(0, 10);

    const { data: docs } = await admin
      .from("documents")
      .select("id, file_name, category, owner_id, profiles(notification_preferences)")
      .eq("expires_at", targetDate)
      .is("deleted_at", null);

    for (const doc of docs ?? []) {
      const prefs = parsePreferences(doc.profiles?.notification_preferences);
      if (!prefs.expiry_alerts) {
        results.push({ document: doc.file_name, days, sent: false, reason: "préférence off" });
        continue;
      }

      const { data: owner } = await admin.auth.admin.getUserById(doc.owner_id);
      const email = owner.user?.email;
      if (!email) {
        results.push({ document: doc.file_name, days, sent: false, reason: "email introuvable" });
        continue;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      try {
        const resend = createResendClient();
        const { error } = await resend.emails.send({
          from: `Phil <${fromEmail()}>`,
          to: email,
          subject: `Ton document expire dans ${days} jours`,
          react: DocumentExpiryEmail({
            documentName: doc.file_name,
            categoryLabel: CATEGORY_LABELS[doc.category] ?? doc.category,
            daysLeft: days,
            vaultUrl: `${baseUrl}/vault`,
          }),
        });
        results.push({
          document: doc.file_name,
          days,
          sent: !error,
          reason: error?.message,
        });
      } catch (e) {
        results.push({ document: doc.file_name, days, sent: false, reason: String(e) });
      }
    }
  }

  return Response.json({ checked_at: today.toISOString(), alerts: results });
}
