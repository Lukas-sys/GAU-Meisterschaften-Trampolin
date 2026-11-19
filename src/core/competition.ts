import { DEFAULT_CLASSES } from "./classConfig";
import { PFLICHT_DEDUCTION_TABLE_2026, pflichtDeduction, type PflichtDeductionTable } from "./pflichtDeduction";
import { STANDARD_PANEL } from "./scoring";
import type { RoutineEntry } from "./results";
import type { Athlete, ClassConfig, ClassId, JudgePanel, Team } from "./types";

export const FORMAT_VERSION = 1;

export interface Judge {
  id: string;
  name: string;
  club: string;
}

/** Mannschaftsreihenfolge einer Klasse, gilt für Pflicht und Kür. */
export interface TeamOrder {
  teamIds: string[];
  /** Zeitpunkt der letzten Auslosung (ISO), null = nur von Hand festgelegt. */
  drawnAt: string | null;
  /** Nach der Auslosung von Hand verändert. */
  editedByHand: boolean;
}

export interface Competition {
  formatVersion: typeof FORMAT_VERSION;
  id: string;
  name: string;
  /** ISO-Datum, z. B. 2026-11-21. */
  date: string;
  location: string;
  panel: JudgePanel;
  classes: Record<ClassId, ClassConfig>;
  pflichtTable: PflichtDeductionTable;
  teams: Team[];
  judges: Judge[];
  /** Fehlt, solange noch nicht gelost wurde. Optional, damit ältere Dateien gültig bleiben. */
  teamOrder?: Partial<Record<ClassId, TeamOrder>>;
  /** Wertungen je Übung, Schlüssel „durchgang:athletId“. Optional für ältere Dateien. */
  routines?: Record<string, RoutineEntry>;
  /** Von Hand entschiedene Reihenfolge bei Punktgleichheit, je Klasse und Wertung. */
  tieBreaks?: Partial<Record<ClassId, Partial<Record<TieStage, string[]>>>>;
  /** Bestätigte Finalmannschaften je Klasse, beste zuerst. */
  finals?: Partial<Record<ClassId, ConfirmedFinal>>;
}

export type TieStage = "vorkampf" | "final";

export interface ConfirmedFinal {
  /** Finalmannschaften in Vorkampf-Reihenfolge, beste zuerst. */
  teamIds: string[];
  confirmedAt: string;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function competitionYear(competition: Pick<Competition, "date">): number {
  return Number(competition.date.slice(0, 4));
}

export function createCompetition(fields: Pick<Competition, "name" | "date" | "location">): Competition {
  return {
    formatVersion: FORMAT_VERSION,
    id: newId(),
    ...fields,
    panel: { ...STANDARD_PANEL },
    classes: structuredClone(DEFAULT_CLASSES),
    pflichtTable: structuredClone(PFLICHT_DEDUCTION_TABLE_2026),
    teams: [],
    judges: [],
  };
}

export function createAthlete(fields: Partial<Athlete> = {}): Athlete {
  return {
    id: newId(),
    lastName: "",
    firstName: "",
    birthYear: 0,
    pflichtLevel: null,
    startPositions: {},
    ...fields,
  };
}

export function createTeam(fields: Pick<Team, "club" | "classId"> & Partial<Team>): Team {
  return { id: newId(), number: 1, athletes: [], ...fields };
}

/** Nächste freie Mannschaftsnummer eines Vereins in einer Klasse. */
export function nextTeamNumber(teams: Team[], club: string, classId: ClassId): number {
  const key = club.trim().toLowerCase();
  const used = teams
    .filter((t) => t.club.trim().toLowerCase() === key && t.classId === classId)
    .map((t) => t.number);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

export function teamLabel(team: Pick<Team, "club" | "number">): string {
  return `${team.club || "Ohne Verein"} ${team.number}`;
}

export function serializeCompetition(competition: Competition): string {
  return JSON.stringify(competition, null, 2);
}

export function parseCompetition(text: string): Competition {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Die Datei ist keine gültige Wettkampfdatei.");
  }
  const candidate = data as Partial<Competition> | null;
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.teams)) {
    throw new Error("Die Datei ist keine gültige Wettkampfdatei.");
  }
  if (candidate.formatVersion !== FORMAT_VERSION) {
    throw new Error(
      `Die Datei hat das Format ${String(candidate.formatVersion)}, dieses Programm kennt Format ${FORMAT_VERSION}. Bitte das Programm aktualisieren.`,
    );
  }
  return candidate as Competition;
}

/** Gültiger Pflichtabzug: von Hand überschrieben oder aus der Tabelle berechnet. */
export function athletePflichtDeduction(athlete: Athlete, competition: Competition): number | undefined {
  if (athlete.pflichtDeductionOverride !== undefined) return athlete.pflichtDeductionOverride;
  if (!athlete.pflichtLevel || !athlete.birthYear) return undefined;
  return pflichtDeduction(athlete.birthYear, athlete.pflichtLevel, competitionYear(competition), competition.pflichtTable);
}
