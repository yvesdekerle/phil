import { describe, expect, it } from "vitest";
import { countPending, type PendingInput } from "@/lib/notifications/pending";

const NOW = new Date("2026-07-08T12:00:00Z").getTime();
const FUTURE = "2026-07-20T12:00:00Z";
const PAST = "2026-07-01T12:00:00Z";

function input(over: Partial<PendingInput>): PendingInput {
  return {
    nowMs: NOW,
    openPolls: [],
    myVotedPollIds: new Set(),
    poolIdeas: [],
    myVotedIdeaIds: new Set(),
    activities: [],
    myVotedActivityIds: new Set(),
    ...over,
  };
}

describe("countPending — sondages", () => {
  it("compte les sondages ouverts non votés, ignore les votés", () => {
    const map = countPending(
      input({
        openPolls: [
          { id: "p1", tripId: "t1", closesAt: null },
          { id: "p2", tripId: "t1", closesAt: FUTURE },
          { id: "p3", tripId: "t1", closesAt: null },
        ],
        myVotedPollIds: new Set(["p3"]),
      }),
    );
    expect(map.get("t1")).toMatchObject({ polls: 2, total: 2 });
  });

  it("ignore un sondage dont l'échéance est passée", () => {
    const map = countPending(input({ openPolls: [{ id: "p1", tripId: "t1", closesAt: PAST }] }));
    expect(map.get("t1")).toBeUndefined();
  });
});

describe("countPending — idées & activités", () => {
  it("compte les idées POOL non réagies", () => {
    const map = countPending(
      input({
        poolIdeas: [
          { id: "i1", tripId: "t1" },
          { id: "i2", tripId: "t1" },
        ],
        myVotedIdeaIds: new Set(["i1"]),
      }),
    );
    expect(map.get("t1")).toMatchObject({ ideas: 1, total: 1 });
  });

  it("compte les activités non swipées", () => {
    const map = countPending(
      input({
        activities: [
          { id: "a1", tripId: "t1" },
          { id: "a2", tripId: "t1" },
          { id: "a3", tripId: "t1" },
        ],
        myVotedActivityIds: new Set(["a2"]),
      }),
    );
    expect(map.get("t1")).toMatchObject({ activities: 2, total: 2 });
  });
});

describe("countPending — agrégation multi-voyages", () => {
  it("sépare les compteurs par voyage et additionne le total par catégorie", () => {
    const map = countPending(
      input({
        openPolls: [{ id: "p1", tripId: "t1", closesAt: null }],
        activities: [
          { id: "a1", tripId: "t1" },
          { id: "a2", tripId: "t2" },
        ],
        poolIdeas: [{ id: "i1", tripId: "t2" }],
      }),
    );
    expect(map.get("t1")).toMatchObject({ polls: 1, activities: 1, ideas: 0, total: 2 });
    expect(map.get("t2")).toMatchObject({ polls: 0, activities: 1, ideas: 1, total: 2 });
  });

  it("aucune action en attente → Map vide (pas d'entrée à zéro)", () => {
    const map = countPending(
      input({
        openPolls: [{ id: "p1", tripId: "t1", closesAt: null }],
        myVotedPollIds: new Set(["p1"]),
      }),
    );
    expect(map.size).toBe(0);
  });
});
