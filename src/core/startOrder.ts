import type { RoundKind, Team } from "./types";

export interface StartListEntry {
  startNumber: number;
  teamId: string;
  athleteId: string;
  position: number;
}

/**
 * Startliste eines Durchgangs: erst Startplatz 1 aller Mannschaften in der
 * vorgegebenen Mannschaftsreihenfolge, dann Startplatz 2 usw.
 */
export function buildStartList(teamsInOrder: Team[], round: RoundKind): StartListEntry[] {
  const positions = new Set<number>();
  for (const team of teamsInOrder) {
    for (const athlete of team.athletes) {
      const position = athlete.startPositions[round];
      if (position !== undefined) positions.add(position);
    }
  }

  const entries: StartListEntry[] = [];
  for (const position of [...positions].sort((a, b) => a - b)) {
    for (const team of teamsInOrder) {
      for (const athlete of team.athletes) {
        if (athlete.startPositions[round] !== position) continue;
        entries.push({
          startNumber: entries.length + 1,
          teamId: team.id,
          athleteId: athlete.id,
          position,
        });
      }
    }
  }
  return entries;
}

/** Finale: schwächste Finalmannschaft zuerst, beste zuletzt. */
export function finalTeamOrder<T>(finalistsBestFirst: T[]): T[] {
  return [...finalistsBestFirst].reverse();
}

/** Zufällige Reihenfolge (Fisher-Yates). `random` ist austauschbar, damit Tests reproduzierbar sind. */
export function drawOrder<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
