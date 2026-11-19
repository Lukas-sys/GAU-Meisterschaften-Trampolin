import { athletePflichtDeduction, type Competition } from "./competition";
import { roundScore } from "./math";
import { scoreRoutine, type ScoreBreakdown } from "./scoring";
import { computeStandings, type RoundScores, type TeamStanding } from "./teamScoring";
import { VORKAMPF_ROUNDS, type Athlete, type ClassId, type JudgePanel, type RoundKind } from "./types";

/** Eingegebene Wertung einer Übung. Felder bleiben leer (null), bis sie eingetragen sind. */
export interface RoutineEntry {
  /** absent = nicht angetreten; zählt nicht für die Mannschaft. */
  status: "entered" | "absent";
  execution: (number | null)[];
  hd: (number | null)[];
  difficulty?: number;
  timeOfFlight?: number;
  otherDeduction?: number;
  /** Anzahl gewerteter Sprünge („ab“). Nur Information. */
  completedElements?: number;
}

export type RoutineState = "open" | "incomplete" | "scored" | "absent";

export const ROUTINE_STATE_LABELS: Record<RoutineState, string> = {
  open: "offen",
  incomplete: "unvollständig",
  scored: "gewertet",
  absent: "nicht angetreten",
};

export const routineKey = (round: RoundKind, athleteId: string) => `${round}:${athleteId}`;

export function emptyRoutine(panel: JudgePanel): RoutineEntry {
  return {
    status: "entered",
    execution: Array.from({ length: panel.executionJudges }, () => null),
    hd: Array.from({ length: panel.hdJudges }, () => null),
  };
}

export function getRoutine(competition: Competition, round: RoundKind, athleteId: string): RoutineEntry | undefined {
  return competition.routines?.[routineKey(round, athleteId)];
}

export function setRoutine(
  competition: Competition,
  round: RoundKind,
  athleteId: string,
  entry: RoutineEntry | undefined,
): Competition {
  const routines = { ...competition.routines };
  if (entry === undefined) delete routines[routineKey(round, athleteId)];
  else routines[routineKey(round, athleteId)] = entry;
  return { ...competition, routines };
}

const isNumber = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

function requiredNotes(entry: RoutineEntry, panel: JudgePanel) {
  return {
    execution: Array.from({ length: panel.executionJudges }, (_, i) => entry.execution[i] ?? null),
    hd: Array.from({ length: panel.hdJudges }, (_, i) => entry.hd[i] ?? null),
  };
}

export function routineState(entry: RoutineEntry | undefined, panel: JudgePanel): RoutineState {
  if (!entry) return "open";
  if (entry.status === "absent") return "absent";
  const { execution, hd } = requiredNotes(entry, panel);
  const notes = [...execution, ...hd];
  const optional = [entry.difficulty, entry.timeOfFlight, entry.otherDeduction, entry.completedElements];
  if (notes.every((n) => !isNumber(n)) && optional.every((n) => !isNumber(n))) return "open";
  return notes.every(isNumber) ? "scored" : "incomplete";
}

export interface RoutineIssue {
  severity: "error" | "warning";
  field: string;
  message: string;
}

const isTenth = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;

/** Plausibilitätsprüfung der Eingabe; Fehler verhindern nicht das Speichern, sollen aber auffallen. */
export function routineIssues(entry: RoutineEntry | undefined, panel: JudgePanel): RoutineIssue[] {
  if (!entry || entry.status === "absent") return [];
  const issues: RoutineIssue[] = [];
  const { execution, hd } = requiredNotes(entry, panel);
  execution.forEach((n, i) => {
    if (!isNumber(n)) return;
    if (n < 0 || n > 10) issues.push({ severity: "error", field: `E${i + 1}`, message: `E${i + 1} muss zwischen 0 und 10 liegen.` });
    else if (!isTenth(n)) issues.push({ severity: "warning", field: `E${i + 1}`, message: `E${i + 1} hat mehr als eine Nachkommastelle.` });
  });
  hd.forEach((n, i) => {
    if (!isNumber(n)) return;
    if (n < 0 || n > 10) issues.push({ severity: "error", field: `HD${i + 1}`, message: `HD${i + 1} muss zwischen 0 und 10 liegen.` });
  });
  const scored = execution.filter(isNumber);
  if (scored.length >= 2 && Math.max(...scored) - Math.min(...scored) > 1.5) {
    issues.push({ severity: "warning", field: "E", message: "Die Haltungsnoten liegen mehr als 1,5 auseinander. Bitte prüfen." });
  }
  if (isNumber(entry.difficulty) && (entry.difficulty < 0 || entry.difficulty > 25)) {
    issues.push({ severity: "error", field: "D", message: "D muss zwischen 0 und 25 liegen." });
  }
  if (isNumber(entry.timeOfFlight) && (entry.timeOfFlight < 0 || entry.timeOfFlight > 30)) {
    issues.push({ severity: "error", field: "ToF", message: "ToF muss zwischen 0 und 30 liegen." });
  }
  if (isNumber(entry.otherDeduction) && entry.otherDeduction < 0) {
    issues.push({ severity: "error", field: "Sonst", message: "Der sonstige Abzug wird positiv eingetragen." });
  }
  const ab = entry.completedElements;
  if (isNumber(ab) && (ab < 0 || ab > 10 || !Number.isInteger(ab))) {
    issues.push({ severity: "error", field: "ab", message: "„ab“ ist eine ganze Zahl von 0 bis 10." });
  }
  return issues;
}

/** Pflichtabzug zählt nur in der Pflicht. */
export function routineDeduction(competition: Competition, athlete: Athlete, round: RoundKind): number {
  return round === "pflicht" ? (athletePflichtDeduction(athlete, competition) ?? 0) : 0;
}

/** Punkte der Übung, sobald alle Pflichtfelder eingetragen sind. */
export function routineBreakdown(
  competition: Competition,
  athlete: Athlete,
  round: RoundKind,
  entry: RoutineEntry | undefined = getRoutine(competition, round, athlete.id),
): ScoreBreakdown | undefined {
  const panel = competition.panel;
  if (routineState(entry, panel) !== "scored") return undefined;
  const { execution, hd } = requiredNotes(entry!, panel);
  return scoreRoutine(
    {
      execution: execution as number[],
      hd: hd as number[],
      difficulty: entry!.difficulty,
      timeOfFlight: entry!.timeOfFlight,
      otherDeduction: entry!.otherDeduction,
    },
    panel,
    routineDeduction(competition, athlete, round),
  );
}

/** Endpunkte aller gewerteten Übungen einer Klasse je Durchgang. */
export function classRoundScores(competition: Competition, classId: ClassId): RoundScores {
  const scores: RoundScores = new Map();
  const rounds = competition.classes[classId].rounds;
  for (const team of competition.teams.filter((t) => t.classId === classId)) {
    for (const athlete of team.athletes) {
      for (const round of rounds) {
        const breakdown = routineBreakdown(competition, athlete, round);
        if (!breakdown) continue;
        if (!scores.has(round)) scores.set(round, new Map());
        scores.get(round)!.set(athlete.id, breakdown.total);
      }
    }
  }
  return scores;
}

/** Zwischenstand nach dem Vorkampf (Pflicht + Kür). */
export function vorkampfStandings(competition: Competition, classId: ClassId): TeamStanding[] {
  const config = competition.classes[classId];
  return computeStandings(
    competition.teams.filter((t) => t.classId === classId),
    classRoundScores(competition, classId),
    {
      countingScores: config.countingScores,
      rounds: VORKAMPF_ROUNDS.filter((r) => config.rounds.includes(r)),
      rankBy: "vorkampf",
      tieBreakOrder: competition.tieBreaks?.[classId]?.vorkampf,
    },
  );
}

export interface RoundProgress {
  scored: number;
  absent: number;
  total: number;
}

export function progressOf(states: RoutineState[]): RoundProgress {
  return {
    scored: states.filter((s) => s === "scored").length,
    absent: states.filter((s) => s === "absent").length,
    total: states.length,
  };
}

/** Punkte mit zwei Nachkommastellen, drei nur wenn nötig (z. B. bei drei Haltungsnoten). */
export function formatPoints(value: number): string {
  const v = roundScore(value);
  const twoDigits = Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;
  return v.toFixed(twoDigits ? 2 : 3).replace(".", ",");
}
