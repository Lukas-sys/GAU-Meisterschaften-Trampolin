import fixture from "./fixtures/gvm-2026-nk-beispiel.json";
import type { RoundKind, RoundScores, ScoreInput, Team } from "../src/core";

export interface FixturePerformance {
  athleteId: string;
  round: RoundKind;
  excelPflichtDeduction: number;
  excelTotal: number;
  score: ScoreInput;
}

export const competitionYear: number = fixture.competitionYear;
export const teams = fixture.teams as Team[];
export const performances = fixture.performances as FixturePerformance[];
export const excelStartOrder = fixture.excelStartOrder as Record<"pflicht" | "kuer", string[]>;

export function excelRoundScores(): RoundScores {
  const scores: RoundScores = new Map();
  for (const p of performances) {
    if (!scores.has(p.round)) scores.set(p.round, new Map());
    scores.get(p.round)!.set(p.athleteId, p.excelTotal);
  }
  return scores;
}
