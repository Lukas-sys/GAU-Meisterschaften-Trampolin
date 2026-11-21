import { classStartList, type StartListRow } from "./draw";
import { getRoutine, routineState } from "./results";
import type { ClassId, RoundKind } from "./types";
import type { Competition } from "./competition";

/**
 * Übungen eines Durchgangs, die noch nicht fertig gewertet sind (offen oder unvollständig),
 * in Startreihenfolge. „Nicht angetreten“ zählt als erledigt. Ohne Startliste: leer.
 */
export function openRoutines(competition: Competition, classId: ClassId, round: RoundKind): StartListRow[] {
  if (!competition.classes[classId]?.rounds.includes(round)) return [];
  return classStartList(competition, classId, round).filter((row) => {
    const state = routineState(getRoutine(competition, round, row.athlete.id), competition.panel);
    return state === "open" || state === "incomplete";
  });
}
