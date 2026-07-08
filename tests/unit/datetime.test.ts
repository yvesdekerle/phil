import { describe, expect, it } from "vitest";
import {
  eventDayKey,
  eventTime,
  groupEventsByDay,
  localToUtc,
  localToUtcIso,
} from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";

/**
 * Fuseaux horaires (PHIL-F09) — la règle du projet : stocker en UTC, afficher
 * dans le fuseau IANA de l'événement. C'est facile à casser silencieusement,
 * donc on verrouille le comportement, y compris le passage de minuit.
 */
describe("eventTime / eventDayKey", () => {
  it("affiche l'heure locale à l'Île Maurice (UTC+4)", () => {
    // 15h00 UTC = 19h00 à Maurice
    expect(eventTime("2026-11-13T15:00:00Z", "Indian/Mauritius")).toBe("19h00");
  });

  it("bascule au lendemain quand le fuseau fait passer minuit", () => {
    // 21h30 UTC = 01h30 le lendemain à Maurice
    expect(eventDayKey("2026-11-05T21:30:00Z", "Indian/Mauritius")).toBe("2026-11-06");
    expect(eventTime("2026-11-05T21:30:00Z", "Indian/Mauritius")).toBe("01h30");
  });

  it("reste le même jour à Paris (UTC+1 en novembre)", () => {
    expect(eventDayKey("2026-11-05T22:30:00Z", "Europe/Paris")).toBe("2026-11-05");
    expect(eventTime("2026-11-05T22:30:00Z", "Europe/Paris")).toBe("23h30");
  });

  it("le même instant UTC tombe sur des jours différents selon le fuseau", () => {
    const utc = "2026-11-05T23:30:00Z";
    expect(eventDayKey(utc, "Europe/Paris")).toBe("2026-11-06"); // 00h30
    expect(eventDayKey(utc, "America/New_York")).toBe("2026-11-05"); // 18h30
  });
});

/**
 * Conversion écriture (PHIL-R20) : heure locale murale + fuseau IANA → instant UTC.
 * Point d'entrée unique côté insertion, inverse de `eventTime`.
 */
describe("localToUtc / localToUtcIso", () => {
  it("convertit une heure locale mauricienne (UTC+4) en UTC", () => {
    // 19h00 à Maurice = 15h00 UTC
    expect(localToUtcIso("2026-11-13T19:00", "Indian/Mauritius")).toBe("2026-11-13T15:00:00.000Z");
  });

  it("gère le passage de jour en reculant vers UTC", () => {
    // 01h30 le 6 à Maurice = 21h30 le 5 en UTC
    expect(localToUtcIso("2026-11-06T01:30", "Indian/Mauritius")).toBe("2026-11-05T21:30:00.000Z");
  });

  it("boucle avec eventTime (aller-retour UTC ↔ local)", () => {
    const utcIso = localToUtcIso("2026-11-05T23:30", "Europe/Paris");
    expect(eventTime(utcIso, "Europe/Paris")).toBe("23h30");
  });

  it("localToUtc renvoie une Date correspondant à l'ISO", () => {
    expect(localToUtc("2026-11-13T19:00", "Indian/Mauritius").toISOString()).toBe(
      "2026-11-13T15:00:00.000Z",
    );
  });
});

describe("groupEventsByDay", () => {
  const ev = (id: string, starts_at: string, timezone: string): TripEvent =>
    ({ id, starts_at, timezone, ends_at: null }) as unknown as TripEvent;

  it("regroupe par jour local et trie les jours", () => {
    const days = groupEventsByDay([
      ev("b", "2026-11-06T08:00:00Z", "Indian/Mauritius"),
      ev("a", "2026-11-05T08:00:00Z", "Indian/Mauritius"),
    ]);
    expect(days.map((d) => d.dayKey)).toEqual(["2026-11-05", "2026-11-06"]);
    expect(days[0].events[0].id).toBe("a");
  });

  it("place deux événements du même jour local dans le même groupe", () => {
    const days = groupEventsByDay([
      ev("x", "2026-11-13T06:00:00Z", "Indian/Mauritius"),
      ev("y", "2026-11-13T14:00:00Z", "Indian/Mauritius"),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].events).toHaveLength(2);
  });
});
