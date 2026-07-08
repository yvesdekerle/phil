// Serveur uniquement : repose sur createAdminClient (service role), qui
// lève si la clé n'est pas présente — jamais exposée au client.
import "server-only";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { beneficiaryCollisions, pickTripSuccessor } from "./reassign";

type Admin = ReturnType<typeof createAdminClient>;

const GHOST_EMAIL = "voyageur-parti@phil.internal";
const GHOST_NAME = "Voyageur parti";

/**
 * Compte système « Voyageur parti » (audit D16) : réceptacle des données de
 * groupe d'un membre qui supprime son compte, pour que les soldes du tricount
 * de l'équipage restent justes au lieu d'être silencieusement faussés par la
 * cascade sur `profiles`. Idempotent : créé à la première suppression, réutilisé.
 */
async function getOrCreateGhostId(admin: Admin): Promise<string> {
  const { data: created } = await admin.auth.admin.createUser({
    email: GHOST_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: GHOST_NAME },
  });
  let ghostId = created?.user?.id ?? null;
  if (!ghostId) {
    // Déjà créé lors d'une suppression précédente : on le retrouve par email.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    ghostId = list?.users.find((u) => u.email === GHOST_EMAIL)?.id ?? null;
  }
  if (!ghostId) {
    throw new Error("Compte « Voyageur parti » introuvable");
  }
  // PHIL-R18 : `is_system` rend le fantôme lisible dans les soldes / « payé par »
  // (policy `profiles_select_system`), même s'il n'est participant d'aucun voyage.
  await admin
    .from("profiles")
    .update({ display_name: GHOST_NAME, is_system: true })
    .eq("id", ghostId);
  return ghostId;
}

/**
 * Réattribue au fantôme les données de groupe du partant (voyages survivants) :
 * dépenses, bénéficiaires, photos, sondages, checklist, notes, journal,
 * candidats hébergement. Les votes/participations personnels restent purgés.
 */
async function reassignGroupDataToGhost(
  admin: Admin,
  userId: string,
  ghostId: string,
): Promise<void> {
  const log = (table: string, error: { code?: string } | null): void => {
    if (error) {
      logger.error("ghost_reassign_failed", { table, code: error.code });
    }
  };

  // Colonnes sans unicité par utilisateur : réattribution directe.
  log(
    "expenses.paid_by",
    (await admin.from("expenses").update({ paid_by: ghostId }).eq("paid_by", userId)).error,
  );
  log(
    "expenses.created_by",
    (await admin.from("expenses").update({ created_by: ghostId }).eq("created_by", userId)).error,
  );
  log(
    "trip_photos",
    (await admin.from("trip_photos").update({ uploaded_by: ghostId }).eq("uploaded_by", userId))
      .error,
  );
  log(
    "polls",
    (await admin.from("polls").update({ created_by: ghostId }).eq("created_by", userId)).error,
  );
  log(
    "checklist_items",
    (await admin.from("checklist_items").update({ created_by: ghostId }).eq("created_by", userId))
      .error,
  );
  log(
    "event_notes",
    (await admin.from("event_notes").update({ author_id: ghostId }).eq("author_id", userId)).error,
  );
  log(
    "lodging_candidates",
    (
      await admin
        .from("lodging_candidates")
        .update({ created_by: ghostId })
        .eq("created_by", userId)
    ).error,
  );
  log(
    "journal_entries",
    (await admin.from("journal_entries").update({ author_id: ghostId }).eq("author_id", userId))
      .error,
  );
  // PHIL-R18 : tables collaboratives ajoutées après coup, toutes en `created_by`
  // cascade sur profiles → sans réattribution, les activités/repas/courses/lieux
  // du groupe disparaîtraient avec le partant. Les votes (activity_votes) restent
  // personnels → purgés par la cascade, comme poll_votes/idea_votes.
  log(
    "trip_activities",
    (await admin.from("trip_activities").update({ created_by: ghostId }).eq("created_by", userId))
      .error,
  );
  log(
    "trip_meals.created_by",
    (await admin.from("trip_meals").update({ created_by: ghostId }).eq("created_by", userId)).error,
  );
  log(
    "trip_meals.cook_id",
    (await admin.from("trip_meals").update({ cook_id: ghostId }).eq("cook_id", userId)).error,
  );
  log(
    "shopping_items.created_by",
    (await admin.from("shopping_items").update({ created_by: ghostId }).eq("created_by", userId))
      .error,
  );
  log(
    "shopping_items.checked_by",
    (await admin.from("shopping_items").update({ checked_by: ghostId }).eq("checked_by", userId))
      .error,
  );
  log(
    "shopping_items.buyer_id",
    (await admin.from("shopping_items").update({ buyer_id: ghostId }).eq("buyer_id", userId)).error,
  );
  log(
    "trip_places",
    (await admin.from("trip_places").update({ created_by: ghostId }).eq("created_by", userId))
      .error,
  );

  // expense_beneficiaries : PK (expense_id, user_id). Écarter les rares
  // collisions (deux partants bénéficiaires de la même dépense) avant l'update.
  const [{ data: mine }, { data: ghosts }] = await Promise.all([
    admin.from("expense_beneficiaries").select("expense_id").eq("user_id", userId),
    admin.from("expense_beneficiaries").select("expense_id").eq("user_id", ghostId),
  ]);
  const collisions = beneficiaryCollisions(
    (mine ?? []).map((r) => r.expense_id),
    (ghosts ?? []).map((r) => r.expense_id),
  );
  for (const expense_id of collisions) {
    await admin
      .from("expense_beneficiaries")
      .delete()
      .eq("expense_id", expense_id)
      .eq("user_id", userId);
  }
  log(
    "expense_beneficiaries",
    (await admin.from("expense_beneficiaries").update({ user_id: ghostId }).eq("user_id", userId))
      .error,
  );
}

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

    const successorId = pickTripSuccessor(others);
    if (successorId) {
      await admin
        .from("trip_participants")
        .update({ role: "OWNER" })
        .eq("trip_id", trip_id)
        .eq("user_id", successorId);
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

  // 5.bis — Données de groupe (dépenses, bénéficiaires, photos, sondages…) :
  // réattribution au « Voyageur parti » AVANT la suppression, sinon la cascade
  // sur profiles les efface et fausse silencieusement les soldes de l'équipage.
  const ghostId = await getOrCreateGhostId(admin);
  await reassignGroupDataToGhost(admin, userId, ghostId);

  // 6. Le compte auth (cascade : profil, participations, votes, passkeys, audit)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Suppression du compte auth échouée: ${error.message}`);
  }
}
