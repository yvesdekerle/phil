import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { countPending, type PendingCounts } from "./pending";

/**
 * Récupère les actions en attente (PHIL-U02) par voyage pour un utilisateur.
 * Requêtes plates bornées aux voyages passés en argument (la RLS garantit que ce
 * sont bien les siens) puis agrégation pure via `countPending`. Utilisé par la
 * liste des voyages (tous les voyages) et par le layout d'un voyage (un seul).
 * Renvoie une Map vide si aucun voyage — aucun appel réseau dans ce cas.
 */
export async function getPendingByTrip(
  supabase: SupabaseClient<Database>,
  userId: string,
  tripIds: string[],
): Promise<Map<string, PendingCounts>> {
  if (tripIds.length === 0) {
    return new Map();
  }

  const [openPolls, poolIdeas, activities] = await Promise.all([
    supabase
      .from("polls")
      .select("id, trip_id, closes_at")
      .in("trip_id", tripIds)
      .is("closed_at", null),
    supabase.from("trip_ideas").select("id, trip_id").in("trip_id", tripIds).eq("status", "POOL"),
    supabase.from("trip_activities").select("id, trip_id").in("trip_id", tripIds),
  ]);

  const pollIds = (openPolls.data ?? []).map((p) => p.id);
  const ideaIds = (poolIdeas.data ?? []).map((i) => i.id);

  const [myPollVotes, myIdeaVotes, myActivityVotes] = await Promise.all([
    supabase.from("poll_votes").select("poll_id").eq("user_id", userId).in("poll_id", pollIds),
    supabase.from("idea_votes").select("idea_id").eq("user_id", userId).in("idea_id", ideaIds),
    supabase
      .from("activity_votes")
      .select("activity_id")
      .eq("user_id", userId)
      .in("trip_id", tripIds),
  ]);

  return countPending({
    nowMs: Date.now(),
    openPolls: (openPolls.data ?? []).map((p) => ({
      id: p.id,
      tripId: p.trip_id,
      closesAt: p.closes_at,
    })),
    myVotedPollIds: new Set((myPollVotes.data ?? []).map((v) => v.poll_id)),
    poolIdeas: (poolIdeas.data ?? []).map((i) => ({ id: i.id, tripId: i.trip_id })),
    myVotedIdeaIds: new Set((myIdeaVotes.data ?? []).map((v) => v.idea_id)),
    activities: (activities.data ?? []).map((a) => ({ id: a.id, tripId: a.trip_id })),
    myVotedActivityIds: new Set((myActivityVotes.data ?? []).map((v) => v.activity_id)),
  });
}
