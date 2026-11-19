import { athletePflichtDeduction, type Competition, type TeamOrder } from "./competition";
import { finalTeams } from "./final";
import { buildStartList, drawOrder } from "./startOrder";
import type { Athlete, ClassId, RoundKind, Team } from "./types";

export interface ClassTeamOrder {
  /** Mannschaften in Startreihenfolge (nur die, die in der gespeicherten Reihenfolge stehen). */
  ordered: Team[];
  /** Mannschaften der Klasse, die noch nicht in der Reihenfolge stehen (z. B. Nachmeldungen). */
  missing: Team[];
  order: TeamOrder | undefined;
}

/** Aktuelle Mannschaftsreihenfolge einer Klasse; gelöschte oder umgemeldete Mannschaften fallen heraus. */
export function classTeamOrder(competition: Competition, classId: ClassId): ClassTeamOrder {
  const teams = competition.teams.filter((t) => t.classId === classId);
  const order = competition.teamOrder?.[classId];
  const byId = new Map(teams.map((t) => [t.id, t]));
  const ordered = (order?.teamIds ?? []).flatMap((id) => byId.get(id) ?? []);
  const placed = new Set(ordered.map((t) => t.id));
  return { ordered, missing: teams.filter((t) => !placed.has(t.id)), order };
}

function withOrder(competition: Competition, classId: ClassId, order: TeamOrder): Competition {
  return { ...competition, teamOrder: { ...competition.teamOrder, [classId]: order } };
}

/** Lost alle Mannschaften einer Klasse neu aus. */
export function drawClass(
  competition: Competition,
  classId: ClassId,
  random: () => number = Math.random,
  now: Date = new Date(),
): Competition {
  const ids = competition.teams.filter((t) => t.classId === classId).map((t) => t.id);
  return withOrder(competition, classId, {
    teamIds: drawOrder(ids, random),
    drawnAt: now.toISOString(),
    editedByHand: false,
  });
}

/** Verschiebt eine Mannschaft innerhalb der Reihenfolge um `delta` Plätze. */
export function moveTeam(competition: Competition, classId: ClassId, teamId: string, delta: number): Competition {
  const { ordered, order } = classTeamOrder(competition, classId);
  const ids = ordered.map((t) => t.id);
  const from = ids.indexOf(teamId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return competition;
  ids.splice(to, 0, ...ids.splice(from, 1));
  return withOrder(competition, classId, {
    teamIds: ids,
    drawnAt: order?.drawnAt ?? null,
    editedByHand: true,
  });
}

/** Hängt Nachmeldungen hinten an, ohne die bisherige Reihenfolge zu verändern. */
export function appendMissingTeams(competition: Competition, classId: ClassId): Competition {
  const { ordered, missing, order } = classTeamOrder(competition, classId);
  return withOrder(competition, classId, {
    teamIds: [...ordered, ...missing].map((t) => t.id),
    drawnAt: order?.drawnAt ?? null,
    editedByHand: order ? order.editedByHand || missing.length > 0 : true,
  });
}

export interface StartListRow {
  startNumber: number;
  /** Startplatz innerhalb der Mannschaft; Zeilen mit gleichem Startplatz bilden einen Block. */
  position: number;
  /** Platz der Mannschaft in der Reihenfolge (1 = erste Mannschaft). */
  teamRank: number;
  team: Team;
  athlete: Athlete;
  pflichtDeduction: number | undefined;
}

/** Startliste einer Klasse und eines Durchgangs in der gespeicherten Mannschaftsreihenfolge. */
export function classStartList(competition: Competition, classId: ClassId, round: RoundKind): StartListRow[] {
  // Im Finale gilt die Finalreihenfolge (schwächste Finalmannschaft zuerst), sonst die geloste.
  const ordered = round === "finale" ? finalTeams(competition, classId) : classTeamOrder(competition, classId).ordered;
  const teams = new Map(ordered.map((t, i) => [t.id, { team: t, rank: i + 1 }]));
  return buildStartList(ordered, round).map((entry) => {
    const { team, rank } = teams.get(entry.teamId)!;
    const athlete = team.athletes.find((a) => a.id === entry.athleteId)!;
    return {
      startNumber: entry.startNumber,
      position: entry.position,
      teamRank: rank,
      team,
      athlete,
      pflichtDeduction: athletePflichtDeduction(athlete, competition),
    };
  });
}
