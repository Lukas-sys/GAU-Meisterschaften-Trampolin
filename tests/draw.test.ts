import { describe, expect, it } from "vitest";
import {
  appendMissingTeams,
  classStartList,
  classTeamOrder,
  createAthlete,
  createCompetition,
  createTeam,
  drawClass,
  moveTeam,
  type Competition,
} from "../src/core";
import { excelStartOrder, teams } from "./fixture";

function seeded(seed = 7) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function competitionWith(): Competition {
  const c = createCompetition({ name: "Test", date: "2026-11-21", location: "Ort" });
  return { ...c, teams: structuredClone(teams) };
}

const nkIds = () => teams.filter((t) => t.classId === "NK").map((t) => t.id);

describe("Auslosung", () => {
  it("lost alle Mannschaften der Klasse und merkt sich den Zeitpunkt", () => {
    const c = drawClass(competitionWith(), "NK", seeded(), new Date("2026-11-21T08:00:00Z"));
    const order = c.teamOrder?.NK;
    expect([...order!.teamIds].sort()).toEqual([...nkIds()].sort());
    expect(order!.drawnAt).toBe("2026-11-21T08:00:00.000Z");
    expect(order!.editedByHand).toBe(false);
    expect(classTeamOrder(c, "NK").missing).toEqual([]);
  });

  it("ist mit gleichem Zufall reproduzierbar", () => {
    const a = drawClass(competitionWith(), "NK", seeded(3)).teamOrder?.NK?.teamIds;
    const b = drawClass(competitionWith(), "NK", seeded(3)).teamOrder?.NK?.teamIds;
    expect(a).toEqual(b);
  });

  it("verschiebt Mannschaften von Hand und markiert das", () => {
    let c = drawClass(competitionWith(), "NK", seeded());
    const [first, second] = c.teamOrder!.NK!.teamIds;
    c = moveTeam(c, "NK", second, -1);
    expect(c.teamOrder!.NK!.teamIds.slice(0, 2)).toEqual([second, first]);
    expect(c.teamOrder!.NK!.editedByHand).toBe(true);
    expect(c.teamOrder!.NK!.drawnAt).not.toBeNull();
    expect(moveTeam(c, "NK", second, -1)).toBe(c);
  });

  it("erkennt Nachmeldungen und hängt sie hinten an", () => {
    let c = drawClass(competitionWith(), "NK", seeded());
    const late = createTeam({ club: "Nachmeldung", classId: "NK", athletes: [createAthlete({ lastName: "X", startPositions: { pflicht: 1 } })] });
    c = { ...c, teams: [...c.teams, late] };
    expect(classTeamOrder(c, "NK").missing).toEqual([late]);
    c = appendMissingTeams(c, "NK");
    expect(c.teamOrder!.NK!.teamIds.at(-1)).toBe(late.id);
    expect(classTeamOrder(c, "NK").missing).toEqual([]);
  });

  it("lässt gelöschte und umgemeldete Mannschaften aus der Reihenfolge fallen", () => {
    let c = drawClass(competitionWith(), "NK", seeded());
    const [gone, moved] = c.teamOrder!.NK!.teamIds;
    c = {
      ...c,
      teams: c.teams.filter((t) => t.id !== gone).map((t) => (t.id === moved ? { ...t, classId: "OK" as const } : t)),
    };
    const ids = classTeamOrder(c, "NK").ordered.map((t) => t.id);
    expect(ids).not.toContain(gone);
    expect(ids).not.toContain(moved);
    expect(classTeamOrder(c, "OK").missing.map((t) => t.id)).toContain(moved);
  });
});

describe("Startliste einer Klasse", () => {
  it.each(["pflicht", "kuer"] as const)("entspricht in der Excel-Reihenfolge der Excel (%s)", (round) => {
    const c: Competition = {
      ...competitionWith(),
      teamOrder: { NK: { teamIds: nkIds(), drawnAt: null, editedByHand: true } },
    };
    const rows = classStartList(c, "NK", round);
    expect(rows.map((r) => r.athlete.id)).toEqual(excelStartOrder[round]);
    expect(rows[0].teamRank).toBe(1);
  });

  it("ist leer, solange nicht gelost wurde", () => {
    expect(classStartList(competitionWith(), "NK", "pflicht")).toEqual([]);
  });
});
