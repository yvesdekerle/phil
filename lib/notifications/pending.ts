/**
 * Rappels « actions en attente » (PHIL-U02). Logique **pure** (aucune dépendance
 * DB → testable) qui compte, par voyage et pour un utilisateur, ce qu'il lui
 * reste à trancher :
 * - **sondages** ouverts (non clôturés, échéance non passée) qu'il n'a pas votés ;
 * - **idées** encore dans le pool (`POOL`) sur lesquelles il n'a pas réagi ;
 * - **activités** à swiper qu'il n'a pas encore tranchées.
 *
 * Les pastilles s'affichent sur les cartes de la liste des voyages et sur les
 * onglets Sondages / Idées / À swiper à l'intérieur du voyage.
 */

export interface PendingCounts {
  polls: number;
  ideas: number;
  activities: number;
  total: number;
}

export interface PendingInput {
  nowMs: number;
  openPolls: { id: string; tripId: string; closesAt: string | null }[];
  myVotedPollIds: Set<string>;
  poolIdeas: { id: string; tripId: string }[];
  myVotedIdeaIds: Set<string>;
  activities: { id: string; tripId: string }[];
  myVotedActivityIds: Set<string>;
}

export const EMPTY_PENDING: PendingCounts = { polls: 0, ideas: 0, activities: 0, total: 0 };

/** Compte les actions en attente par voyage (Map tripId → compteurs). */
export function countPending(input: PendingInput): Map<string, PendingCounts> {
  const byTrip = new Map<string, PendingCounts>();
  const bump = (tripId: string, key: "polls" | "ideas" | "activities") => {
    const c = byTrip.get(tripId) ?? { polls: 0, ideas: 0, activities: 0, total: 0 };
    c[key] += 1;
    c.total += 1;
    byTrip.set(tripId, c);
  };

  for (const p of input.openPolls) {
    const open = p.closesAt === null || new Date(p.closesAt).getTime() > input.nowMs;
    if (open && !input.myVotedPollIds.has(p.id)) {
      bump(p.tripId, "polls");
    }
  }
  for (const i of input.poolIdeas) {
    if (!input.myVotedIdeaIds.has(i.id)) {
      bump(i.tripId, "ideas");
    }
  }
  for (const a of input.activities) {
    if (!input.myVotedActivityIds.has(a.id)) {
      bump(a.tripId, "activities");
    }
  }

  return byTrip;
}
