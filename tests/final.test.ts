import { describe, expect, it } from "vitest";
import {
  classStartList,
  confirmFinalists,
  createAthlete,
  createCompetition,
  createTeam,
  finalProposal,
  finalStandings,
  finalTeams,
  moveInTie,
  resetFinalists,
  setRoutine,
  type Competition,
  type RoundKind,
  type Team,
} from "../src/core";

/** Mannschaft mit vier Turner:innen, die in jedem Durchgang die angegebene Punktzahl erreichen. */
function team(club: string): Team {
  return createTeam({
    club,
    classId: "OK",
    athletes: [1, 2, 3, 4].map((n) =>
      createAthlete({ lastName: `${club}${n}`, birthYear: 2000, pflichtLevel: "M6", startPositions: { pflicht: n, kuer: n, finale: n } }),
    ),
  });
}

/** Trägt für alle Turner:innen einer Mannschaft eine Übung ein, deren Haltung `execution` ergibt (HD 9,0). */
function score(c: Competition, t: Team, round: RoundKind, execution: number): Competition {
  const note = execution / 2;
  return t.athletes.reduce(
    (acc, a) => setRoutine(acc, round, a.id, { status: "entered", execution: [note, note, note, note], hd: [9, 9] }),
    c,
  );
}

function setup(vorkampf: Record<string, number>) {
  const teams = Object.keys(vorkampf).map(team);
  let c: Competition = { ...createCompetition({ name: "T", date: "2026-11-21", location: "O" }), teams };
  for (const t of teams) {
    c = score(c, t, "pflicht", vorkampf[t.club]);
    c = score(c, t, "kuer", vorkampf[t.club]);
  }
  const id = (club: string) => teams.find((t) => t.club === club)!.id;
  return { c, teams, id };
}

describe("Finalisten", () => {
  it("schlägt die besten 2/3 vor (3 von 5)", () => {
    const { c, id } = setup({ A: 14, B: 13, C: 12, D: 11, E: 10 });
    const proposal = finalProposal(c, "OK")!;
    expect(proposal.count).toBe(3);
    expect(proposal.proposedIds).toEqual([id("A"), id("B"), id("C")]);
    expect(proposal.tiedAtCutoff).toEqual([]);
  });

  it("gibt es ohne Finale in der Klasse nicht", () => {
    const { c } = setup({ A: 14 });
    expect(finalProposal(c, "NK")).toBeNull();
  });

  it("meldet Gleichstand an der Grenze, bis er von Hand entschieden ist", () => {
    const { c, id } = setup({ A: 14, B: 13, C: 12, D: 12, E: 10 });
    const proposal = finalProposal(c, "OK")!;
    expect(proposal.tiedAtCutoff.sort()).toEqual([id("C"), id("D")].sort());

    const decided = moveInTie(c, "OK", "vorkampf", [id("C"), id("D")], id("D"), -1);
    const after = finalProposal(decided, "OK")!;
    expect(after.tiedAtCutoff).toEqual([]);
    expect(after.proposedIds).toEqual([id("A"), id("B"), id("D")]);
  });

  it("merkt, wenn sich der Vorkampf nach dem Bestätigen ändert", () => {
    const { c, teams, id } = setup({ A: 14, B: 13, C: 12, D: 11, E: 10 });
    let confirmed = confirmFinalists(c, "OK", finalProposal(c, "OK")!.proposedIds);
    expect(finalProposal(confirmed, "OK")!.outdated).toBe(false);
    confirmed = score(confirmed, teams.find((t) => t.club === "D")!, "kuer", 18);
    expect(finalProposal(confirmed, "OK")!.outdated).toBe(true);
    expect(finalProposal(resetFinalists(confirmed, "OK"), "OK")!.outdated).toBe(false);
    expect(id("A")).toBeTruthy();
  });
});

describe("Finaldurchgang", () => {
  it("startet mit der schwächsten Finalmannschaft, Turner:innen reihum", () => {
    const { c, id } = setup({ A: 14, B: 13, C: 12, D: 11, E: 10 });
    const confirmed = confirmFinalists(c, "OK", [id("A"), id("B"), id("C")]);
    expect(finalTeams(confirmed, "OK").map((t) => t.club)).toEqual(["C", "B", "A"]);
    const list = classStartList(confirmed, "OK", "finale");
    expect(list.slice(0, 4).map((r) => r.athlete.lastName)).toEqual(["C1", "B1", "A1", "C2"]);
    expect(list).toHaveLength(12);
  });
});

describe("Endergebnis", () => {
  it("wertet Finalmannschaften nach Pflicht + Kür + Finale, die übrigen dahinter nach dem Vorkampf", () => {
    const { c, teams, id } = setup({ A: 14, B: 13, C: 12, D: 11, E: 10 });
    let done = confirmFinalists(c, "OK", [id("A"), id("B"), id("C")]);
    const byClub = (club: string) => teams.find((t) => t.club === club)!;
    done = score(done, byClub("A"), "finale", 10);
    done = score(done, byClub("B"), "finale", 14);
    done = score(done, byClub("C"), "finale", 16);
    const result = finalStandings(done, "OK");
    // A: 4×(23+23+19) = 260, B: 4×(22+22+23) = 268, C: 4×(21+21+25) = 268 → Gleichstand B/C
    expect(result.map((s) => [teams.find((t) => t.id === s.teamId)!.club, s.rank, s.total, s.finalist])).toEqual([
      ["B", 1, 268, true],
      ["C", 1, 268, true],
      ["A", 3, 260, true],
      ["D", 4, 160, false],
      ["E", 5, 152, false],
    ]);
    expect(result[0].unresolvedTie).toBe(true);

    const decided = finalStandings(moveInTie(done, "OK", "final", [id("B"), id("C")], id("C"), -1), "OK");
    expect(decided.slice(0, 2).map((s) => [s.teamId, s.rank])).toEqual([
      [id("C"), 1],
      [id("B"), 2],
    ]);
  });

  it("ist ohne bestätigtes Finale der Vorkampf", () => {
    const { c } = setup({ A: 14, B: 13 });
    expect(finalStandings(c, "OK").map((s) => [s.rank, s.total, s.finalist])).toEqual([
      [1, 184, false],
      [2, 176, false],
    ]);
  });
});

describe("Export", () => {
  it("schreibt eine Zeile je Turner:in mit Dezimalkomma", async () => {
    const { resultsCsv } = await import("../src/core");
    const { c, id } = setup({ A: 14, B: 13 });
    const csv = resultsCsv(confirmFinalists(c, "OK", [id("A")]));
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(lines).toHaveLength(9);
    expect(lines[0].startsWith("Klasse;Rang;Mannschaft;Finale")).toBe(true);
    expect(lines[1]).toContain("Offene Klasse;1;A 1;ja;92;92;0;184;A1;;2000;M6;0;23;x;23;x;;");
  });
});
