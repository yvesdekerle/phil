// Serveur uniquement : repose sur createAdminClient (service role), qui
// lève si la clé n'est pas présente — jamais exposée au client.
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Purge RGPD d'un compte (PHIL-C06), via service role.
 * Ordre imposé par les FK RESTRICT (created_by, invited_by) :
 *  1. documents possédés (storage + base, les partages suivent) ;
 *  2. voyages dont je suis l'unique participant → suppression ;
 *  3. voyages dont je suis OWNER → transfert au plus ancien EDITOR
 *     (à défaut au plus ancien participant) ;
 *  4. événements créés par moi dans les voyages survivants → réassignés
 *     au capitaine du voyage (le programme appartient au groupe) ;
 *  5. idées et invitations créées par moi → supprimées ;
 *  6. suppression du user auth → cascade profils, participations, votes,
 *     passkeys et journal d'audit.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const admin = createAdminClient();

  // 1. Documents possédés
  const { data: docs } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("owner_id", userId);
  if (docs?.length) {
    await admin.storage.from("documents").remove(docs.map((d) => d.storage_path));
    await admin
      .from("documents")
      .delete()
      .in(
        "id",
        docs.map((d) => d.id),
      );
  }

  // 2 & 3. Voyages dont je suis OWNER
  const { data: myOwnerships } = await admin
    .from("trip_participants")
    .select("trip_id")
    .eq("user_id", userId)
    .eq("role", "OWNER");

  for (const { trip_id } of myOwnerships ?? []) {
    const { data: others } = await admin
      .from("trip_participants")
      .select("user_id, role, joined_at")
      .eq("trip_id", trip_id)
      .neq("user_id", userId)
      .order("joined_at", { ascending: true });

    if (!others || others.length === 0) {
      // Seul à bord : le voyage disparaît (events/idées/invitations en cascade)
      await admin.from("trip_events").delete().eq("trip_id", trip_id);
      await admin.from("trip_ideas").delete().eq("trip_id", trip_id);
      await admin.from("trip_invitations").delete().eq("trip_id", trip_id);
      await admin.from("trips").delete().eq("id", trip_id);
      continue;
    }

    const hasOtherOwner = others.some((p) => p.role === "OWNER");
    if (!hasOtherOwner) {
      const successor = others.find((p) => p.role === "EDITOR") ?? others[0];
      await admin
        .from("trip_participants")
        .update({ role: "OWNER" })
        .eq("trip_id", trip_id)
        .eq("user_id", successor.user_id);
    }
  }

  // 4. Réassignation des events créés par moi dans les voyages survivants
  const { data: myEvents } = await admin
    .from("trip_events")
    .select("id, trip_id")
    .eq("created_by", userId);
  for (const event of myEvents ?? []) {
    const { data: owner } = await admin
      .from("trip_participants")
      .select("user_id")
      .eq("trip_id", event.trip_id)
      .eq("role", "OWNER")
      .neq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (owner) {
      await admin.from("trip_events").update({ created_by: owner.user_id }).eq("id", event.id);
    } else {
      await admin.from("trip_events").delete().eq("id", event.id);
    }
  }

  // Même traitement pour les voyages créés par moi mais transférés
  const { data: myTrips } = await admin.from("trips").select("id").eq("created_by", userId);
  for (const trip of myTrips ?? []) {
    const { data: owner } = await admin
      .from("trip_participants")
      .select("user_id")
      .eq("trip_id", trip.id)
      .eq("role", "OWNER")
      .neq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (owner) {
      await admin.from("trips").update({ created_by: owner.user_id }).eq("id", trip.id);
    }
  }

  // 5. Idées et invitations créées par moi
  await admin.from("trip_ideas").delete().eq("created_by", userId);
  await admin.from("trip_invitations").delete().eq("invited_by", userId);

  // 6. Le compte auth (cascade : profil, participations, votes, passkeys, audit)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Suppression du compte auth échouée: ${error.message}`);
  }
}
