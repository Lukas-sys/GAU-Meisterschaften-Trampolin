import type { Competition, TieStage } from "./competition";
import { classRoundScores, vorkampfStandings } from "./results";
import { computeStandings, finalistCount, selectFinalists, type TeamStanding } from "./teamScoring";
import { finalTeamOrder } from "./startOrder";
import type { ClassId, Team } from "./types";

export interface FinalProposal {
  /** Vorkampf-Rangliste, auf der der Vorschlag beruht. */
  standings: TeamStanding[];
  count: number;
  /** Vorgeschlagene Finalmannschaften, beste zuerst. */
  proposedIds: string[];
  /** Punktgleich an der Finalgrenze; muss vor dem Bestätigen entschieden werden. */
  tiedAtCutoff: string[];
  /** Der Vorschlag hat sich seit der Bestätigung geändert (z. B. nach einer Korrektur im Vorkampf). */
  outdated: boolean;
}

export function finalProposal(competition: Competition, classId: ClassId): FinalProposal | null {
  const rule = competition.classes[classId].finalQualification;
  if (!rule) return null;
  const standings = vorkampfStandings(competition, classId);
  const { finalistIds, tiedAtCutoff } = selectFinalists(standings, rule);
  const confirmed = competition.finals?.[classId];
  return {
    standings,
    count: finalistCount(standings.length, rule),
    proposedIds: finalistIds,
    tiedAtCutoff,
    outdated: confirmed !== undefined && (confirmed.basedOn ?? confirmed.teamIds).join() !== finalistIds.join(),
  };
}

/**
 * Bestätigt die Finalmannschaften. Die Auswahl darf vom Vorschlag abweichen (z. B. eine
 * Mannschaft mehr); `basedOn` merkt sich den Vorschlag, um spätere Änderungen zu erkennen.
 * Gespeichert wird in Vorkampf-Reihenfolge, beste zuerst.
 */
export function confirmFinalists(
  competition: Competition,
  classId: ClassId,
  teamIds: string[],
  now: Date = new Date(),
): Competition {
  const standings = vorkampfStandings(competition, classId);
  const rank = (id: string) => {
    const i = standings.findIndex((s) => s.teamId === id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const ordered = [...new Set(teamIds)].sort((a, b) => rank(a) - rank(b));
  const rule = competition.classes[classId].finalQualification;
  const basedOn = rule ? selectFinalists(standings, rule).finalistIds : ordered;
  return {
    ...competition,
    finals: { ...competition.finals, [classId]: { teamIds: ordered, confirmedAt: now.toISOString(), basedOn } },
  };
}

export function resetFinalists(competition: Competition, classId: ClassId): Competition {
  const finals = { ...competition.finals };
  delete finals[classId];
  return { ...competition, finals };
}

/** Finalmannschaften in Startreihenfolge: schwächste zuerst, beste zuletzt. */
export function finalTeams(competition: Competition, classId: ClassId): Team[] {
  const ids = competition.finals?.[classId]?.teamIds ?? [];
  const byId = new Map(competition.teams.filter((t) => t.classId === classId).map((t) => [t.id, t]));
  return finalTeamOrder(ids.flatMap((id) => byId.get(id) ?? []));
}

/**
 * Verschiebt eine Mannschaft innerhalb einer punktgleichen Gruppe und speichert die
 * Reihenfolge der ganzen Gruppe als Entscheidung.
 */
export function moveInTie(
  competition: Competition,
  classId: ClassId,
  stage: TieStage,
  groupIds: string[],
  teamId: string,
  delta: number,
): Competition {
  const order = [...groupIds];
  const from = order.indexOf(teamId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return competition;
  order.splice(to, 0, ...order.splice(from, 1));
  const current = competition.tieBreaks?.[classId]?.[stage] ?? [];
  const merged = [...current.filter((id) => !order.includes(id)), ...order];
  return {
    ...competition,
    tieBreaks: {
      ...competition.tieBreaks,
      [classId]: { ...competition.tieBreaks?.[classId], [stage]: merged },
    },
  };
}

export interface FinalStanding extends TeamStanding {
  finalist: boolean;
}

/**
 * Endergebnis einer Klasse. Mit Finale: Finalmannschaften nach Pflicht + Kür + Finale
 * vorne, danach die übrigen nach dem Vorkampf. Ohne Finale: Vorkampf.
 */
export function finalStandings(competition: Competition, classId: ClassId): FinalStanding[] {
  const config = competition.classes[classId];
  const confirmed = competition.finals?.[classId];
  const vorkampf = vorkampfStandings(competition, classId);
  if (!config.finalQualification || !confirmed) {
    return vorkampf.map((s) => ({ ...s, finalist: false }));
  }

  const finalistIds = new Set(confirmed.teamIds);
  const teams = competition.teams.filter((t) => t.classId === classId);
  const finalists = computeStandings(
    teams.filter((t) => finalistIds.has(t.id)),
    classRoundScores(competition, classId),
    {
      countingScores: config.countingScores,
      rounds: config.rounds,
      rankBy: "total",
      tieBreakOrder: competition.tieBreaks?.[classId]?.final,
    },
  ).map((s) => ({ ...s, finalist: true }));

  const offset = finalists.length;
  const others = vorkampf
    .filter((s) => !finalistIds.has(s.teamId))
    .map((s, i, list) => {
      // Ränge der übrigen schließen an die Finalmannschaften an.
      const firstOfRank = list.findIndex((o) => o.rank === s.rank);
      return { ...s, rank: offset + (s.unresolvedTie ? firstOfRank : i) + 1, total: s.vorkampf, finalist: false };
    });
  return [...finalists, ...others];
}


