import { competitionYear, teamLabel, type Competition } from "./competition";
import type { Athlete, RoundKind, Team } from "./types";

export type IssueSeverity = "error" | "warning";

export interface Issue {
  severity: IssueSeverity;
  message: string;
  teamId?: string;
  athleteId?: string;
}

export const ROUND_LABELS: Record<RoundKind, string> = {
  pflicht: "Pflicht",
  kuer: "Kür",
  finale: "Finale",
};

function athleteName(a: Athlete): string {
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unbenannte Person";
}

function validateAthlete(
  athlete: Athlete,
  team: Team,
  competition: Competition,
): Issue[] {
  const issues: Issue[] = [];
  const at = { teamId: team.id, athleteId: athlete.id };
  const name = athleteName(athlete);
  const year = competitionYear(competition);
  const config = competition.classes[team.classId];

  if (!athlete.lastName.trim() && !athlete.firstName.trim()) {
    issues.push({ severity: "error", message: `${teamLabel(team)}: Name fehlt.`, ...at });
  }
  if (!Number.isInteger(athlete.birthYear) || athlete.birthYear < year - 100 || athlete.birthYear > year) {
    issues.push({ severity: "error", message: `${name}: Jahrgang fehlt oder ist ungültig.`, ...at });
  } else if (config.maxAge !== null && year - athlete.birthYear > config.maxAge) {
    issues.push({
      severity: "warning",
      message: `${name}: Jahrgang ${athlete.birthYear} ist für die ${config.name} zu alt (max. ${config.maxAge} Jahre).`,
      ...at,
    });
  }
  if (athlete.startPositions.pflicht !== undefined && athlete.pflichtLevel === null) {
    issues.push({ severity: "error", message: `${name}: Pflichtstufe fehlt.`, ...at });
  }
  for (const round of Object.keys(athlete.startPositions) as RoundKind[]) {
    if (!config.rounds.includes(round)) {
      issues.push({
        severity: "warning",
        message: `${name}: Startplatz ${ROUND_LABELS[round]} wird ignoriert, die ${config.name} hat keinen solchen Durchgang.`,
        ...at,
      });
    }
  }
  return issues;
}

function validateRound(team: Team, round: RoundKind, competition: Competition): Issue[] {
  const issues: Issue[] = [];
  const config = competition.classes[team.classId];
  const label = `${teamLabel(team)}, ${ROUND_LABELS[round]}`;
  const starters = team.athletes.filter((a) => a.startPositions[round] !== undefined);
  const positions = starters.map((a) => a.startPositions[round]!);

  if (starters.length > config.maxStartersPerRound) {
    issues.push({
      severity: "error",
      message: `${label}: ${starters.length} Starter:innen, erlaubt sind ${config.maxStartersPerRound}.`,
      teamId: team.id,
    });
  }
  const outOfRange = positions.filter((p) => !Number.isInteger(p) || p < 1 || p > config.maxStartersPerRound);
  if (outOfRange.length > 0) {
    issues.push({
      severity: "error",
      message: `${label}: Startplatz ${outOfRange.join(", ")} liegt nicht zwischen 1 und ${config.maxStartersPerRound}.`,
      teamId: team.id,
    });
  }
  const duplicates = [...new Set(positions.filter((p, i) => positions.indexOf(p) !== i))];
  if (duplicates.length > 0) {
    issues.push({
      severity: "error",
      message: `${label}: Startplatz ${duplicates.join(", ")} ist mehrfach vergeben.`,
      teamId: team.id,
    });
  }
  if (round !== "finale" && starters.length < config.countingScores) {
    issues.push({
      severity: "warning",
      message: `${label}: nur ${starters.length} Starter:innen, gewertet werden ${config.countingScores}.`,
      teamId: team.id,
    });
  }
  return issues;
}

export function validateTeam(team: Team, competition: Competition): Issue[] {
  const config = competition.classes[team.classId];
  const issues: Issue[] = [];
  if (!team.club.trim()) {
    issues.push({ severity: "error", message: "Mannschaft ohne Verein.", teamId: team.id });
  }
  if (team.athletes.length > config.maxTeamSize) {
    issues.push({
      severity: "error",
      message: `${teamLabel(team)}: ${team.athletes.length} Turner:innen, erlaubt sind ${config.maxTeamSize}.`,
      teamId: team.id,
    });
  }
  for (const round of config.rounds) issues.push(...validateRound(team, round, competition));
  for (const athlete of team.athletes) issues.push(...validateAthlete(athlete, team, competition));
  return issues;
}

export function validateCompetition(competition: Competition): Issue[] {
  const issues = competition.teams.flatMap((team) => validateTeam(team, competition));

  const seenTeams = new Map<string, Team>();
  const seenAthletes = new Map<string, Team>();
  for (const team of competition.teams) {
    const teamKey = `${team.classId}|${team.club.trim().toLowerCase()}|${team.number}`;
    if (seenTeams.has(teamKey)) {
      issues.push({
        severity: "error",
        message: `${teamLabel(team)} gibt es in der Klasse ${team.classId} doppelt.`,
        teamId: team.id,
      });
    }
    seenTeams.set(teamKey, team);

    for (const athlete of team.athletes) {
      if (!athlete.lastName.trim()) continue;
      const key = `${athlete.lastName.trim().toLowerCase()}|${athlete.firstName.trim().toLowerCase()}|${athlete.birthYear}`;
      const other = seenAthletes.get(key);
      if (other) {
        issues.push({
          severity: "warning",
          message: `${athleteName(athlete)} ist in ${teamLabel(other)} und ${teamLabel(team)} gemeldet.`,
          teamId: team.id,
          athleteId: athlete.id,
        });
      }
      seenAthletes.set(key, team);
    }
  }
  return issues;
}
