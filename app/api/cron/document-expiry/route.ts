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
      .select("id, file_name, category, owner_id, profiles(notification_preferences)")
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
