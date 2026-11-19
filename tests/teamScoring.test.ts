import { describe, expect, it } from "vitest";
import {
  computeStandings,
  finalistCount,
  selectFinalists,
  teamRoundResult,
  type Team,
} from "../src/core";
import { excelRoundScores, teams } from "./fixture";

const options = { countingScores: 4, rounds: ["pflicht", "kuer"] as const, rankBy: "vorkampf" as const };

describe("Mannschaftswertung", () => {
  it("summiert die besten 4 je Durchgang und rankt nach Vorkampf", () => {
    const standings = computeStandings(teams, excelRoundScores(), { ...options, rounds: [...options.rounds] });
    expect(standings.map((s) => [s.teamId, s.rounds.pflicht?.total, s.rounds.kuer?.total, s.vorkampf, s.rank])).toEqual([
      ["Verein C", 95.3, 103.05, 198.35, 1],
      ["Verein A", 96.3, 97.65, 193.95, 2],
      ["Verein E", 96.45, 96.25, 192.7, 3],
      ["Verein B", 92.65, 95.25, 187.9, 4],
      ["Verein D", 93.2, 91.75, 184.95, 5],
    ]);
  });

  it("wählt bei gleicher 4.-bester Wertung alphabetisch", () => {
    const team: Team = {
      id: "T", club: "T", number: 1, classId: "OK",
      athletes: ["Zett", "Berg", "Adler", "Mai", "Klein"].map((lastName) => ({
        id: lastName, lastName, firstName: "", birthYear: 2010, pflichtLevel: null, startPositions: {},
      })),
    };
    const scores = new Map([["Zett", 25], ["Berg", 24], ["Mai", 23], ["Adler", 20], ["Klein", 20]]);
    const result = teamRoundResult(team, scores, 4);
    expect(result.total).toBe(92);
    expect(result.countedAthleteIds).toEqual(["Zett", "Berg", "Mai", "Adler"]);
  });

  it("markiert Gleichstand und übernimmt eine manuelle Entscheidung", () => {
    const scores = new Map([["pflicht" as const, new Map<string, number>()]]);
    const twoTeams = teams.slice(0, 2).map((t) => ({ ...t, athletes: [] }));
    const tied = computeStandings(twoTeams, scores, { ...options, rounds: ["pflicht"] });
    expect(tied.map((s) => [s.rank, s.unresolvedTie])).toEqual([[1, true], [1, true]]);

    const decided = computeStandings(twoTeams, scores, {
      ...options, rounds: ["pflicht"], tieBreakOrder: ["Verein B", "Verein A"],
    });
    expect(decided.map((s) => [s.teamId, s.rank, s.unresolvedTie])).toEqual([
      ["Verein B", 1, false],
      ["Verein A", 2, false],
    ]);
  });
});

describe("Finale", () => {
  const rule = { fraction: 2 / 3, maxTeams: 5 };

  it.each([
    [3, 2], [4, 2], [5, 3], [6, 4], [7, 4], [9, 5], [12, 5],
  ])("bei %i Mannschaften kommen %i ins Finale", (teamCount, expected) => {
    expect(finalistCount(teamCount, rule)).toBe(expected);
  });

  it("meldet Gleichstand an der Finalgrenze", () => {
    const standings = ["A", "B", "C"].map((teamId, i) => ({
      teamId, rounds: {}, vorkampf: 0, total: 0, rank: i === 0 ? 1 : 2, unresolvedTie: i > 0,
    }));
    expect(selectFinalists(standings, rule)).toEqual({ finalistIds: ["A", "B"], tiedAtCutoff: ["B", "C"] });
  });
});
