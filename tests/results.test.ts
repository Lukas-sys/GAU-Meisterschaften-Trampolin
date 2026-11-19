import { describe, expect, it } from "vitest";
import {
  createCompetition,
  emptyRoutine,
  formatPoints,
  routineBreakdown,
  routineIssues,
  routineState,
  setRoutine,
  STANDARD_PANEL,
  vorkampfStandings,
  type Competition,
  type RoutineEntry,
} from "../src/core";
import { performances, teams } from "./fixture";

/** Wettkampf mit den Excel-Wertungen; Pflichtabzug wie in der Excel, damit die Summen vergleichbar sind. */
function excelCompetition(): Competition {
  const deduction = new Map(performances.filter((p) => p.round === "pflicht").map((p) => [p.athleteId, p.excelPflichtDeduction]));
  let c: Competition = {
    ...createCompetition({ name: "Test", date: "2026-11-21", location: "Ort" }),
    teams: teams.map((t) => ({
      ...t,
      athletes: t.athletes.map((a) => ({ ...a, pflichtDeductionOverride: deduction.get(a.id) ?? 0 })),
    })),
  };
  for (const p of performances) {
    c = setRoutine(c, p.round, p.athleteId, {
      status: "entered",
      execution: p.score.execution,
      hd: p.score.hd,
      difficulty: p.score.difficulty,
      otherDeduction: p.score.otherDeduction,
      completedElements: p.score.completedElements,
    });
  }
  return c;
}

const entry = (fields: Partial<RoutineEntry>): RoutineEntry => ({ ...emptyRoutine(STANDARD_PANEL), ...fields });

describe("Status einer Übung", () => {
  it("unterscheidet offen, unvollständig, gewertet und nicht angetreten", () => {
    expect(routineState(undefined, STANDARD_PANEL)).toBe("open");
    expect(routineState(entry({}), STANDARD_PANEL)).toBe("open");
    expect(routineState(entry({ execution: [6, 6, null, 6] }), STANDARD_PANEL)).toBe("incomplete");
    expect(routineState(entry({ execution: [6, 6, 6, 6], hd: [9, null] }), STANDARD_PANEL)).toBe("incomplete");
    expect(routineState(entry({ execution: [6, 6, 6, 6], hd: [9, 9] }), STANDARD_PANEL)).toBe("scored");
    expect(routineState(entry({ status: "absent" }), STANDARD_PANEL)).toBe("absent");
  });

  it("braucht ohne HD-Kampfgericht keine HD-Noten", () => {
    const panel = { ...STANDARD_PANEL, hdJudges: 0 as const };
    expect(routineState(entry({ execution: [6, 6, 6, 6], hd: [] }), panel)).toBe("scored");
  });
});

describe("Punkte", () => {
  it("rechnet jede Übung wie die Excel", () => {
    const c = excelCompetition();
    const athletes = new Map(c.teams.flatMap((t) => t.athletes).map((a) => [a.id, a]));
    for (const p of performances) {
      expect(routineBreakdown(c, athletes.get(p.athleteId)!, p.round)?.total, `${p.round} ${p.athleteId}`).toBeCloseTo(p.excelTotal, 6);
    }
  });

  it("zieht den Pflichtabzug nur in der Pflicht ab", () => {
    let c = excelCompetition();
    const athlete = { ...c.teams[0].athletes[0], pflichtDeductionOverride: 0.9 };
    c = setRoutine(c, "pflicht", athlete.id, entry({ execution: [6, 6, 6, 6], hd: [9, 9] }));
    c = setRoutine(c, "kuer", athlete.id, entry({ execution: [6, 6, 6, 6], hd: [9, 9] }));
    expect(routineBreakdown(c, athlete, "pflicht")?.total).toBe(20.1);
    expect(routineBreakdown(c, athlete, "kuer")?.total).toBe(21);
  });

  it("ergibt den Zwischenstand der Excel", () => {
    const standings = vorkampfStandings(excelCompetition(), "NK");
    expect(standings.map((s) => [s.teamId, s.vorkampf, s.rank])).toEqual([
      ["Verein C", 198.35, 1],
      ["Verein A", 193.95, 2],
      ["Verein E", 192.7, 3],
      ["Verein B", 187.9, 4],
      ["Verein D", 184.95, 5],
    ]);
  });

  it("lässt nicht angetretene und unvollständige Übungen aus der Mannschaftswertung", () => {
    let c = excelCompetition();
    const team = c.teams.find((t) => t.id === "Verein C")!;
    const counted = vorkampfStandings(c, "NK").find((s) => s.teamId === team.id)!.rounds.pflicht!.countedAthleteIds;
    c = setRoutine(c, "pflicht", counted[0], entry({ status: "absent" }));
    c = setRoutine(c, "pflicht", counted[1], entry({ execution: [6, null, 6, 6] }));
    const after = vorkampfStandings(c, "NK").find((s) => s.teamId === team.id)!.rounds.pflicht!;
    expect(after.countedAthleteIds).not.toContain(counted[0]);
    expect(after.countedAthleteIds).not.toContain(counted[1]);
  });

  it("formatiert Punkte mit zwei, wenn nötig drei Nachkommastellen", () => {
    expect(formatPoints(23.7)).toBe("23,70");
    expect(formatPoints(13.333)).toBe("13,333");
  });
});

describe("Plausibilität", () => {
  it("meldet Noten außerhalb des erlaubten Bereichs", () => {
    const issues = routineIssues(entry({ execution: [11, 6, 6.25, 6], hd: [9, 12], otherDeduction: -1 }), STANDARD_PANEL);
    expect(issues.map((i) => [i.severity, i.field])).toEqual([
      ["error", "E1"],
      ["warning", "E3"],
      ["error", "HD2"],
      ["warning", "E"],
      ["error", "Sonst"],
    ]);
  });
});
