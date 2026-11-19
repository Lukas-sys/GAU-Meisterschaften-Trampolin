/**
 * Was die Beamer-Ansicht zeigt. Das Hauptfenster berechnet alles und schickt nur dieses
 * fertige Objekt an das Beamer-Fenster; dort wird nichts mehr gerechnet.
 */
import { teamLabel, type Competition } from "./competition";
import { classStartList } from "./draw";
import { finalStandings } from "./final";
import { getRoutine, routineBreakdown, routineState, vorkampfStandings, type RoutineState } from "./results";
import type { ClassId, RoundKind } from "./types";
import { ROUND_LABELS } from "./validation";

/** Was auf dem Beamer zu sehen ist. */
export type BeamerMode = "routine" | "standings" | "pause";

export const BEAMER_MODE_LABELS: Record<BeamerMode, string> = {
  routine: "Übung und Zwischenstand",
  standings: "Nur Zwischenstand",
  pause: "Pause",
};

export interface BeamerRoutine {
  startNumber: number;
  name: string;
  team: string;
  state: RoutineState;
  /** Nur bei gewerteten Übungen. */
  score?: {
    execution: number;
    hd: number;
    difficulty: number;
    timeOfFlight: number;
    /** Pflichtabzug + sonstiger Abzug. */
    deduction: number;
    total: number;
  };
}

export interface BeamerStandingRow {
  rank: number;
  tie: boolean;
  team: string;
  /** Punkte je angezeigter Spalte, null = noch nichts gewertet. */
  points: (number | null)[];
  highlight: boolean;
}

export interface BeamerView {
  mode: BeamerMode;
  title: string;
  subtitle: string;
  current?: BeamerRoutine;
  /** Die zuletzt gewertete Übung vor der aktuellen. */
  previous?: BeamerRoutine;
  next: { name: string; team: string }[];
  standings: { columns: string[]; rows: BeamerStandingRow[] };
  progress: { scored: number; total: number };
}

function routineOf(competition: Competition, round: RoundKind, row: ReturnType<typeof classStartList>[number]): BeamerRoutine {
  const entry = getRoutine(competition, round, row.athlete.id);
  const state = routineState(entry, competition.panel);
  const breakdown = routineBreakdown(competition, row.athlete, round, entry);
  return {
    startNumber: row.startNumber,
    name: [row.athlete.firstName, row.athlete.lastName].filter(Boolean).join(" "),
    team: teamLabel(row.team),
    state,
    score: breakdown && {
      execution: breakdown.execution,
      hd: breakdown.hd,
      difficulty: breakdown.difficulty,
      timeOfFlight: breakdown.timeOfFlight,
      deduction: breakdown.pflichtDeduction + breakdown.otherDeduction,
      total: breakdown.total,
    },
  };
}

/** Beamer-Inhalt für die Übung an Position `index` der Startliste. */
export function beamerView(
  competition: Competition,
  classId: ClassId,
  round: RoundKind,
  index: number,
  mode: BeamerMode,
): BeamerView {
  const config = competition.classes[classId];
  const rows = classStartList(competition, classId, round);
  const routines = rows.map((row) => routineOf(competition, round, row));
  const current = routines[index];
  const previous = routines
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((r) => r.state === "scored");

  const isFinal = round === "finale";
  const standings = isFinal
    ? finalStandings(competition, classId).filter((s) => s.finalist)
    : vorkampfStandings(competition, classId);
  const teams = new Map(competition.teams.map((t) => [t.id, t]));
  const shownRounds = config.rounds.filter((r) => r !== "finale" || isFinal);
  const value = (result: { total: number; countedAthleteIds: string[] } | undefined) =>
    result && result.countedAthleteIds.length > 0 ? result.total : null;

  return {
    mode,
    title: competition.name,
    subtitle: `${config.name} · ${ROUND_LABELS[round]}`,
    current,
    previous,
    next: rows.slice(index + 1, index + 3).map((row) => ({
      name: [row.athlete.firstName, row.athlete.lastName].filter(Boolean).join(" "),
      team: teamLabel(row.team),
    })),
    standings: {
      columns: [...shownRounds.map((r) => ROUND_LABELS[r]), isFinal ? "Gesamt" : "Vorkampf"],
      rows: standings.map((s) => ({
        rank: s.rank,
        tie: s.unresolvedTie,
        team: teamLabel(teams.get(s.teamId)!),
        points: [...shownRounds.map((r) => value(s.rounds[r])), isFinal ? s.total : s.vorkampf],
        highlight: rows[index]?.team.id === s.teamId,
      })),
    },
    progress: {
      scored: routines.filter((r) => r.state === "scored" || r.state === "absent").length,
      total: routines.length,
    },
  };
}
