import { describe, expect, it } from "vitest";
import {
  consensusByActivity,
  hasVotedAll,
  matches,
  participantProgress,
  ranked,
  type VoteRow,
} from "@/lib/activities/consensus";

// Équipage de 3, deux activités.
const CREW = ["u1", "u2", "u3"];
const votes = (rows: [string, string, VoteRow["verdict"]][]): VoteRow[] =>
  rows.map(([activityId, userId, verdict]) => ({ activityId, userId, verdict }));

describe("consensusByActivity — agrégation par activité", () => {
  it("compte chaque verdict et calcule le score pondéré SUPER×2 + YES − NO", () => {
    const rows = consensusByActivity(
      ["a"],
      votes([
        ["a", "u1", "SUPER"],
        ["a", "u2", "YES"],
        ["a", "u3", "NO"],
      ]),
      3,
    );
    const a = rows[0];
    expect(a.supers).toBe(1);
    expect(a.likes).toBe(1);
    expect(a.nos).toBe(1);
    expect(a.voters).toBe(3);
    expect(a.score).toBe(2 + 1 - 1); // = 2
  });

  it("un match = tout l'équipage a voté ET tous les verdicts positifs", () => {
    const [a] = consensusByActivity(
      ["a"],
      votes([
        ["a", "u1", "SUPER"],
        ["a", "u2", "YES"],
        ["a", "u3", "YES"],
      ]),
      3,
    );
    expect(a.isMatch).toBe(true);
  });

  it("pas de match si un MAYBE/NO traîne, même avec tout l'équipage", () => {
    const [a] = consensusByActivity(
      ["a"],
      votes([
        ["a", "u1", "YES"],
        ["a", "u2", "MAYBE"],
        ["a", "u3", "YES"],
      ]),
      3,
    );
    expect(a.isMatch).toBe(false);
  });

  it("pas de match si l'équipage n'a pas voté au complet", () => {
    const [a] = consensusByActivity(
      ["a"],
      votes([
        ["a", "u1", "YES"],
        ["a", "u2", "SUPER"],
      ]),
      3,
    );
    expect(a.voters).toBe(2);
    expect(a.isMatch).toBe(false);
  });

  it("activité sans aucun vote → tout à zéro, pas de match", () => {
    const [a] = consensusByActivity(["a"], [], 3);
    expect(a).toMatchObject({ supers: 0, likes: 0, maybes: 0, nos: 0, voters: 0, isMatch: false });
  });
});

describe("ranked & matches — tri", () => {
  it("classe par score puis départage par SUPER", () => {
    const rows = consensusByActivity(
      ["a", "b"],
      votes([
        // a : 2 YES → score 2
        ["a", "u1", "YES"],
        ["a", "u2", "YES"],
        // b : 1 SUPER → score 2 aussi, mais plus de SUPER → devant
        ["b", "u1", "SUPER"],
      ]),
      3,
    );
    expect(ranked(rows).map((r) => r.activityId)).toEqual(["b", "a"]);
  });

  it("matches ne garde que les matchs, meilleurs SUPER d'abord", () => {
    const rows = consensusByActivity(
      ["a", "b", "c"],
      votes([
        // a : match, 1 SUPER
        ["a", "u1", "YES"],
        ["a", "u2", "YES"],
        ["a", "u3", "SUPER"],
        // b : match, 3 SUPER
        ["b", "u1", "SUPER"],
        ["b", "u2", "SUPER"],
        ["b", "u3", "SUPER"],
        // c : pas un match (un NO)
        ["c", "u1", "NO"],
        ["c", "u2", "YES"],
        ["c", "u3", "YES"],
      ]),
      3,
    );
    expect(matches(rows).map((r) => r.activityId)).toEqual(["b", "a"]);
  });
});

describe("participantProgress & hasVotedAll — révélation différée", () => {
  const parts = CREW.map((userId) => ({ userId, name: userId.toUpperCase() }));

  it("compte les activités tranchées par participant et marque done", () => {
    const prog = participantProgress(
      parts,
      votes([
        ["a", "u1", "YES"],
        ["b", "u1", "NO"],
        ["a", "u2", "YES"],
      ]),
      2,
    );
    const byId = Object.fromEntries(prog.map((p) => [p.userId, p]));
    expect(byId.u1).toMatchObject({ voted: 2, total: 2, done: true });
    expect(byId.u2).toMatchObject({ voted: 1, total: 2, done: false });
    expect(byId.u3).toMatchObject({ voted: 0, total: 2, done: false });
  });

  it("trie par progression décroissante puis par nom", () => {
    const prog = participantProgress(
      parts,
      votes([
        ["a", "u2", "YES"],
        ["a", "u3", "YES"],
        ["b", "u3", "YES"],
      ]),
      2,
    );
    expect(prog.map((p) => p.userId)).toEqual(["u3", "u2", "u1"]);
  });

  it("hasVotedAll : true seulement quand tout est tranché", () => {
    const v = votes([
      ["a", "u1", "YES"],
      ["b", "u1", "NO"],
    ]);
    expect(hasVotedAll("u1", v, 2)).toBe(true);
    expect(hasVotedAll("u1", v, 3)).toBe(false);
    expect(hasVotedAll("u2", v, 2)).toBe(false);
  });

  it("hasVotedAll : jamais vrai sans activité (total = 0)", () => {
    expect(hasVotedAll("u1", [], 0)).toBe(false);
  });
});
