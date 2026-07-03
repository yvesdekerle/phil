import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Export RGPD (PHIL-C07) : toutes les données personnelles en un JSON
 * téléchargé directement (authentifié). Limité à un export par 24 h.
 * Les fichiers eux-mêmes ne sont pas embarqués (limites Vercel free) :
 * ils restent téléchargeables individuellement via le viewer.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (profile?.last_export_at) {
    const elapsed = Date.now() - new Date(profile.last_export_at).getTime();
    if (elapsed < 24 * 3600 * 1000) {
      const hours = Math.ceil((24 * 3600 * 1000 - elapsed) / 3600_000);
      return Response.json(
        { error: `Un export par 24 h — réessaie dans ${hours} h.` },
        { status: 429 },
      );
    }
  }

  // Lectures via RLS : on n'exporte que ce que l'utilisateur voit.
  const [
    { data: trips },
    { data: participations },
    { data: events },
    { data: ideas },
    { data: documents },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from("trips").select("*"),
    supabase.from("trip_participants").select("*").eq("user_id", user.id),
    supabase.from("trip_events").select("*").eq("created_by", user.id),
    supabase.from("trip_ideas").select("*").eq("created_by", user.id),
    supabase.from("documents").select("*").eq("owner_id", user.id).is("deleted_at", null),
    supabase.from("vault_access_log").select("*").eq("document_owner_id", user.id),
  ]);

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ last_export_at: new Date().toISOString() })
    .eq("id", user.id);

  const payload = {
    generated_at: new Date().toISOString(),
    note: "Export RGPD Phil. Les fichiers du coffre et des voyages se téléchargent individuellement depuis l'application.",
    profile,
    trips: trips ?? [],
    participations: participations ?? [],
    events_created: events ?? [],
    ideas_created: ideas ?? [],
    documents: documents ?? [],
    vault_access_log: auditLog ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="phil-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
