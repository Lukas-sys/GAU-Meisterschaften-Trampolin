import { roundScore } from "./math";
import type { JudgePanel, ScoreInput } from "./types";

export const STANDARD_PANEL: JudgePanel = { executionJudges: 4, hdJudges: 2, timeOfFlight: false };

export interface ScoreBreakdown {
  execution: number;
  hd: number;
  difficulty: number;
  timeOfFlight: number;
  pflichtDeduction: number;
  otherDeduction: number;
  total: number;
}

/**
 * Haltungsnote. Ab 4 Kampfrichter:innen fallen höchste und niedrigste Note weg.
 * Ergebnis = Mittelwert der verbleibenden Noten × 2; bei 4 Richter:innen ist das
 * genau die Summe der mittleren zwei Noten wie in der bisherigen Excel.
 * Die Regel für 3 oder 5 Richter:innen ist noch mit dem Kampfgericht abzustimmen.
 */
export function executionScore(notes: number[]): number {
  if (notes.length === 0) return 0;
  const sorted = [...notes].sort((a, b) => a - b);
  const counted = sorted.length >= 4 ? sorted.slice(1, -1) : sorted;
  const mean = counted.reduce((sum, n) => sum + n, 0) / counted.length;
  return roundScore(mean * 2);
}

export function hdScore(notes: number[], hdJudges: JudgePanel["hdJudges"]): number {
  const used = notes.slice(0, hdJudges);
  if (used.length === 0) return 0;
  return roundScore(used.reduce((sum, n) => sum + n, 0) / used.length);
}

export function scoreRoutine(
  input: ScoreInput,
  panel: JudgePanel,
  pflichtDeduction = 0,
): ScoreBreakdown {
  const execution = executionScore(input.execution.slice(0, panel.executionJudges));
  const hd = hdScore(input.hd, panel.hdJudges);
  const difficulty = input.difficulty ?? 0;
  const timeOfFlight = panel.timeOfFlight ? (input.timeOfFlight ?? 0) : 0;
  const otherDeduction = input.otherDeduction ?? 0;
  const total = roundScore(
    execution + hd + difficulty + timeOfFlight - pflichtDeduction - otherDeduction,
  );
  return { execution, hd, difficulty, timeOfFlight, pflichtDeduction, otherDeduction, total };
}
