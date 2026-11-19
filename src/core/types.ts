/**
 * Pflichtstufen von leicht nach schwer. „M6+“ in der Ausschreibung heißt nur,
 * dass ab M6 kein Abzug mehr anfällt; gemeldet wird die tatsächliche Stufe.
 */
export const PFLICHT_LEVELS = ["P3", "M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"] as const;
export type PflichtLevel = (typeof PFLICHT_LEVELS)[number];

export type RoundKind = "pflicht" | "kuer" | "finale";
export const VORKAMPF_ROUNDS: readonly RoundKind[] = ["pflicht", "kuer"];

export type ClassId = "OK" | "NK";

export interface Athlete {
  id: string;
  lastName: string;
  firstName: string;
  birthYear: number;
  pflichtLevel: PflichtLevel | null;
  /** Startplatz je Durchgang (1..n). Fehlt der Eintrag, springt die Person in diesem Durchgang nicht. */
  startPositions: Partial<Record<RoundKind, number>>;
  /** Überschreibt den aus der Tabelle berechneten Pflichtabzug. */
  pflichtDeductionOverride?: number;
}

export interface Team {
  id: string;
  club: string;
  /** Mannschaftsnummer innerhalb des Vereins (1. Mannschaft, 2. Mannschaft, ...). */
  number: number;
  classId: ClassId;
  athletes: Athlete[];
}

export interface FinalQualification {
  /** Anteil der Mannschaften, die ins Finale kommen (z. B. 2/3). */
  fraction: number;
  /** Höchstzahl an Finalmannschaften, null = unbegrenzt. */
  maxTeams: number | null;
}

export interface ClassConfig {
  id: ClassId;
  name: string;
  maxTeamSize: number;
  /** Höchstalter (Wettkampfjahr − Jahrgang), null = offen. */
  maxAge: number | null;
  maxStartersPerRound: number;
  countingScores: number;
  rounds: RoundKind[];
  /** null = kein Finale. */
  finalQualification: FinalQualification | null;
}

export interface JudgePanel {
  executionJudges: number;
  /** 0 = keine HD-Wertung, 1 = Wert direkt, 2 = Mittelwert. */
  hdJudges: 0 | 1 | 2;
  timeOfFlight: boolean;
}

/** Eingegebene Noten einer Übung. */
export interface ScoreInput {
  execution: number[];
  hd: number[];
  difficulty?: number;
  timeOfFlight?: number;
  otherDeduction?: number;
  /** Anzahl gewerteter Sprünge bei Abbruch. Nur Information. */
  completedElements?: number;
}

export interface Performance {
  athleteId: string;
  round: RoundKind;
  score: ScoreInput | null;
}
