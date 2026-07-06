import { createResendClient, fromEmail } from "@/lib/email/resend";
import { DocumentExpiryEmail } from "@/lib/email/templates/document-expiry";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { parsePreferences } from "@/lib/notifications/preferences";
import { checkBearer } from "@/lib/security/secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryLabel } from "@/lib/vault/categories";

export const dynamic = "force-dynamic";
// PHIL-Q50 : marge au-delà des 10 s par défaut (envois séquentiels + purge)
export const maxDuration = 60;

/** Seuils d'alerte avant expiration (PHIL-E07). */
const THRESHOLD_DAYS = [180, 90, 30, 7];

/**
 * Cron quotidien (Vercel Cron, 6h UTC) : alerte les propriétaires dont un
 * document expire exactement à J-180/90/30/7 — une alerte par seuil, sans
 * table d'état. Respecte la préférence `expiry_alerts` (PHIL-K04).
 */
export async function GET(request: Request) {
  if (!checkBearer(request, process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date();

  // PHIL-N05 : purge des partages arrivés à échéance
  const { count: purgedShares } = await admin
    .from("document_shares")
    .delete({ count: "exact" })
    .lt("expires_at", today.toISOString());

  // PHIL-Q42 : purge de rétention — un document soft-supprimé depuis plus de
  // 30 jours est effacé du Storage puis de la base (limitation de conservation
  // RGPD ; sans ce balayage, les scans de pièces d'identité restaient à vie).
  const RETENTION_DAYS = 30;
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const { data: staleDocs } = await admin
    .from("documents")
    .select("id, storage_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff.toISOString());
  let purgedDocuments = 0;
  if (staleDocs && staleDocs.length > 0) {
    const paths = staleDocs.map((d) => d.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from("documents").remove(paths);
    }
    const { count } = await admin
      .from("documents")
      .delete({ count: "exact" })
      .in(
        "id",
        staleDocs.map((d) => d.id),
      );
    purgedDocuments = count ?? 0;
  }

  // PHIL-Q42 : on trace par id de document, jamais par nom de fichier (PII en logs)
  const results: { document: string; days: number; sent: boolean; reason?: string }[] = [];

  for (const days of THRESHOLD_DAYS) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + days);
    const targetDate = target.toISOString().slice(0, 10);

    const { data: docs } = await admin
      .from("documents")
      .select("id, file_name, category, owner_id, profiles(notification_preferences, locale)")
      .eq("expires_at", targetDate)
      .is("deleted_at", null);

    for (const doc of docs ?? []) {
      const prefs = parsePreferences(doc.profiles?.notification_preferences);
      if (!prefs.expiry_alerts) {
        results.push({ document: doc.id, days, sent: false, reason: "préférence off" });
        continue;
      }

      const { data: owner } = await admin.auth.admin.getUserById(doc.owner_id);
      const email = owner.user?.email;
      if (!email) {
        results.push({ document: doc.id, days, sent: false, reason: "email introuvable" });
        continue;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      // Langue du destinataire (propriétaire du document), pas de l'expéditeur.
      const recipientLocale: Locale = isLocale(doc.profiles?.locale) ? doc.profiles.locale : "fr";
      const t = translator(messages[recipientLocale]);
      const label = categoryLabel(t, doc.category);
      try {
        const resend = createResendClient();
        const { error } = await resend.emails.send({
          from: `Phil <${fromEmail()}>`,
          to: email,
          subject: t("email.expiry.subject").replace("{days}", String(days)),
          react: DocumentExpiryEmail({
            documentName: doc.file_name,
            categoryLabel: label,
            daysLeft: days,
            vaultUrl: `${baseUrl}/vault`,
            locale: recipientLocale,
          }),
        });
        results.push({
          document: doc.id,
          days,
          sent: !error,
          reason: error?.message,
        });
      } catch (e) {
        results.push({ document: doc.id, days, sent: false, reason: String(e) });
      }
    }
  }

  return Response.json({
    checked_at: today.toISOString(),
    alerts: results,
    purged_shares: purgedShares ?? 0,
    purged_documents: purgedDocuments,
  });
}
