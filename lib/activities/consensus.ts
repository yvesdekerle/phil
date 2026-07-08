/**
 * Consensus de groupe sur les activités swipées (PHIL-U04 Phase 2). Logique
 * **pure** (aucune dépendance DB/DOM → testable) : c'est la valeur que Yallah
 * n'a jamais eue — chacun swipe dans son coin, Phil agrège.
 *
 * Trois lectures complémentaires :
 * - **matchs** : une activité où *tout l'équipage* a voté positif (YES/SUPER) ;
 * - **classement** : score pondéré (SUPER×2 + YES − NO) façon Yallah ;
 * - **progression** : combien d'activités chaque participant a déjà tranchées,
 *   pour la révélation différée (`meDone`) qui évite de biaiser ses propres votes.
 */

export type Verdict = "YES" | "NO" | "MAYBE" | "SUPER";

export interface VoteRow {
  activityId: string;
  userId: string;
  verdict: Verdict;
}

export interface Participant {
  userId: string;
  name: string;
}

export interface ActivityConsensusRow {
  activityId: string;
  supers: number;
  likes: number;
  maybes: number;
  nos: number;
  /** Score pondéré SUPER×2 + YES − NO (comme la vue SQL / groupVotes de Yallah). */
  score: number;
  /** Nombre de participants ayant tranché cette activité (tous verdicts). */
  voters: number;
  /** true si tout l'équipage a voté ET tous les verdicts sont positifs. */
  isMatch: boolean;
}

export interface ParticipantProgress {
  userId: string;
  name: string;
  voted: number;
  total: number;
  done: boolean;
}

/** Regroupe les votes par activité (ordre d'apparition préservé). */
function tallyByActivity(votes: VoteRow[]): Map<string, VoteRow[]> {
  const byActivity = new Map<string, VoteRow[]>();
  for (const v of votes) {
    const list = byActivity.get(v.activityId);
    if (list) {
      list.push(v);
    } else {
      byActivity.set(v.activityId, [v]);
    }
  }
  return byActivity;
}

/**
 * Agrège les votes en une ligne de consensus par activité. Une activité est un
 * **match** quand chaque participant a voté et que tous les verdicts sont
 * positifs (YES/SUPER). `crewSize` = nombre de participants du voyage.
 */
export function consensusByActivity(
  activityIds: string[],
  votes: VoteRow[],
  crewSize: number,
): ActivityConsensusRow[] {
  const byActivity = tallyByActivity(votes);
  return activityIds.map((activityId) => {
    const list = byActivity.get(activityId) ?? [];
    let supers = 0;
    let likes = 0;
    let maybes = 0;
    let nos = 0;
    for (const v of list) {
      if (v.verdict === "SUPER") supers += 1;
      else if (v.verdict === "YES") likes += 1;
      else if (v.verdict === "MAYBE") maybes += 1;
      else nos += 1;
    }
    const voters = list.length;
    const positives = supers + likes;
    return {
      activityId,
      supers,
      likes,
      maybes,
      nos,
      score: supers * 2 + likes - nos,
      voters,
      isMatch: crewSize > 0 && voters === crewSize && positives === crewSize,
    };
  });
}

/**
 * Classement décroissant par score, départage par SUPER puis YES (un match
 * franc passe devant un score gonflé par beaucoup de « pourquoi pas »).
 */
export function ranked(rows: ActivityConsensusRow[]): ActivityConsensusRow[] {
  return [...rows].sort((a, b) => b.score - a.score || b.supers - a.supers || b.likes - a.likes);
}

/** Matchs uniquement, meilleurs d'abord (SUPER puis YES). */
export function matches(rows: ActivityConsensusRow[]): ActivityConsensusRow[] {
  return rows.filter((r) => r.isMatch).sort((a, b) => b.supers - a.supers || b.score - a.score);
}

/** Progression de chaque participant (activités tranchées / total). */
export function participantProgress(
  participants: Participant[],
  votes: VoteRow[],
  totalActivities: number,
): ParticipantProgress[] {
  const votedByUser = new Map<string, number>();
  for (const v of votes) {
    votedByUser.set(v.userId, (votedByUser.get(v.userId) ?? 0) + 1);
  }
  return participants
    .map((p) => {
      const voted = Math.min(votedByUser.get(p.userId) ?? 0, totalActivities);
      return {
        userId: p.userId,
        name: p.name,
        voted,
        total: totalActivities,
        done: totalActivities > 0 && voted >= totalActivities,
      };
    })
    .sort((a, b) => b.voted - a.voted || a.name.localeCompare(b.name));
}

/**
 * true si `userId` a tranché toutes les activités → on peut lui révéler le
 * consensus du groupe sans biaiser ses votes restants (`meDone`, anti-biais).
 */
export function hasVotedAll(userId: string, votes: VoteRow[], totalActivities: number): boolean {
  if (totalActivities === 0) return false;
  let count = 0;
  for (const v of votes) {
    if (v.userId === userId) count += 1;
  }
  return count >= totalActivities;
}
