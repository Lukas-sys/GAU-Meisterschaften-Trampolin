import { roundScore } from "./math";
import type { Athlete, FinalQualification, RoundKind, Team } from "./types";
import { VORKAMPF_ROUNDS } from "./types";

/** Endpunktzahl je Person und Durchgang: scores.get(round)?.get(athleteId). */
export type RoundScores = Map<RoundKind, Map<string, number>>;

export interface TeamRoundResult {
  total: number;
  countedAthleteIds: string[];
}

function byName(a: Athlete, b: Athlete): number {
  return (
    a.lastName.localeCompare(b.lastName, "de") || a.firstName.localeCompare(b.firstName, "de")
  );
}

/**
 * Die besten `countingScores` Wertungen einer Mannschaft in einem Durchgang.
 * Bei Gleichstand an der Grenze ist die Summe gleich; markiert wird alphabetisch.
 */
export function teamRoundResult(
  team: Team,
  roundScores: Map<string, number> | undefined,
  countingScores: number,
): TeamRoundResult {
  const scored = team.athletes
    .filter((a) => roundScores?.has(a.id))
    .map((athlete) => ({ athlete, score: roundScores!.get(athlete.id)! }))
    .sort((x, y) => y.score - x.score || byName(x.athlete, y.athlete))
    .slice(0, countingScores);
  return {
    total: roundScore(scored.reduce((sum, s) => sum + s.score, 0)),
    countedAthleteIds: scored.map((s) => s.athlete.id),
  };
}

export interface TeamStanding {
  teamId: string;
  rounds: Partial<Record<RoundKind, TeamRoundResult>>;
  vorkampf: number;
  total: number;
  rank: number;
  /** true, wenn die Platzierung punktgleich ist und nicht manuell entschieden wurde. */
  unresolvedTie: boolean;
}

export interface StandingsOptions {
  countingScores: number;
  rounds: RoundKind[];
  /** Ranglisten-Grundlage: nur Vorkampf (Pflicht + Kür) oder alle Durchgänge. */
  rankBy: "vorkampf" | "total";
  /** Manuelle Entscheidung bei Gleichstand: frühere Mannschaft liegt vorne. */
  tieBreakOrder?: string[];
}

export function computeStandings(
  teams: Team[],
  scores: RoundScores,
  options: StandingsOptions,
): TeamStanding[] {
  const standings = teams.map((team) => {
    const rounds: TeamStanding["rounds"] = {};
    for (const round of options.rounds) {
      rounds[round] = teamRoundResult(team, scores.get(round), options.countingScores);
    }
    const sumOf = (kinds: readonly RoundKind[]) =>
      roundScore(kinds.reduce((sum, k) => sum + (rounds[k]?.total ?? 0), 0));
    return {
      teamId: team.id,
      rounds,
      vorkampf: sumOf(VORKAMPF_ROUNDS.filter((r) => options.rounds.includes(r))),
      total: sumOf(options.rounds),
      rank: 0,
      unresolvedTie: false,
    };
  });

  const points = (s: TeamStanding) => (options.rankBy === "vorkampf" ? s.vorkampf : s.total);
  const tieIndex = (id: string) => {
    const i = options.tieBreakOrder?.indexOf(id) ?? -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  standings.sort((a, b) => points(b) - points(a) || tieIndex(a.teamId) - tieIndex(b.teamId));

  standings.forEach((standing, i) => {
    const previous = standings[i - 1];
    const tiedWithPrevious = previous !== undefined && points(previous) === points(standing);
    const decided =
      tiedWithPrevious &&
      tieIndex(previous.teamId) !== Number.MAX_SAFE_INTEGER &&
      tieIndex(standing.teamId) !== Number.MAX_SAFE_INTEGER;
    if (tiedWithPrevious && !decided) {
      standing.rank = previous.rank;
      standing.unresolvedTie = true;
      previous.unresolvedTie = true;
    } else {
      standing.rank = i + 1;
    }
  });
  return standings;
}

export function finalistCount(teamCount: number, rule: FinalQualification): number {
  const byFraction = Math.floor(teamCount * rule.fraction + 1e-9);
  return rule.maxTeams === null ? byFraction : Math.min(byFraction, rule.maxTeams);
}

export interface FinalistSelection {
  /** Finalmannschaften, beste zuerst. */
  finalistIds: string[];
  /** Mannschaften, die an der Finalgrenze punktgleich sind; Bediener:in muss entscheiden. */
  tiedAtCutoff: string[];
}

export function selectFinalists(
  vorkampfStandings: TeamStanding[],
  rule: FinalQualification,
): FinalistSelection {
  const count = finalistCount(vorkampfStandings.length, rule);
  const finalistIds = vorkampfStandings.slice(0, count).map((s) => s.teamId);
  const last = vorkampfStandings[count - 1];
  const next = vorkampfStandings[count];
  const tiedAtCutoff =
    last && next && last.unresolvedTie && last.rank === next.rank
      ? vorkampfStandings.filter((s) => s.rank === last.rank).map((s) => s.teamId)
      : [];
  return { finalistIds, tiedAtCutoff };
}
