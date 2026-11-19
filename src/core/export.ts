import { athletePflichtDeduction, teamLabel, type Competition } from "./competition";
import { finalStandings, type FinalStanding } from "./final";
import { getRoutine, routineBreakdown, routineState } from "./results";
import type { Athlete, ClassId, RoundKind, Team } from "./types";

export interface AthleteRoundResult {
  /** Punkte, falls gewertet. */
  total?: number;
  absent: boolean;
  counted: boolean;
}

export interface AthleteResult {
  athlete: Athlete;
  rounds: Partial<Record<RoundKind, AthleteRoundResult>>;
}

export interface TeamResult {
  team: Team;
  standing: FinalStanding;
  athletes: AthleteResult[];
}

/** Ergebnis einer Klasse: Mannschaften in Rangfolge mit allen Einzelwertungen. */
export function classResults(competition: Competition, classId: ClassId): TeamResult[] {
  const rounds = competition.classes[classId].rounds;
  const teams = new Map(competition.teams.map((t) => [t.id, t]));
  return finalStandings(competition, classId).map((standing) => {
    const team = teams.get(standing.teamId)!;
    const athletes = team.athletes.map((athlete) => {
      const perRound: AthleteResult["rounds"] = {};
      for (const round of rounds) {
        const entry = getRoutine(competition, round, athlete.id);
        const state = routineState(entry, competition.panel);
        if (state === "open" || state === "incomplete") continue;
        perRound[round] = {
          total: routineBreakdown(competition, athlete, round, entry)?.total,
          absent: state === "absent",
          counted: standing.rounds[round]?.countedAthleteIds.includes(athlete.id) ?? false,
        };
      }
      return { athlete, rounds: perRound };
    });
    return { team, standing, athletes };
  });
}

const ROUND_COLUMNS: Record<RoundKind, string> = { pflicht: "Pflicht", kuer: "Kür", finale: "Finale" };

function cell(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Ergebnisse als CSV für Excel (Semikolon, Dezimalkomma, UTF-8 mit BOM).
 * Eine Zeile je Turner:in, Mannschaftswerte wiederholt; „x“ markiert gewertete Übungen.
 */
export function resultsCsv(competition: Competition): string {
  const header = [
    "Klasse", "Rang", "Mannschaft", "Finale", "Mannschaft Pflicht", "Mannschaft Kür", "Mannschaft Finale",
    "Mannschaft Gesamt", "Name", "Vorname", "Jahrgang", "Pflichtstufe", "Pflichtabzug",
    ...(["pflicht", "kuer", "finale"] as const).flatMap((r) => [ROUND_COLUMNS[r], `${ROUND_COLUMNS[r]} zählt`]),
  ];
  const lines = [header.map(cell).join(";")];
  for (const config of Object.values(competition.classes)) {
    for (const { team, standing, athletes } of classResults(competition, config.id)) {
      for (const { athlete, rounds } of athletes) {
        const roundCells = (["pflicht", "kuer", "finale"] as const).flatMap((r) => {
          const result = rounds[r];
          if (!result) return ["", ""];
          return [result.absent ? "n. a." : result.total, result.counted ? "x" : ""];
        });
        lines.push(
          [
            config.name,
            standing.rank,
            teamLabel(team),
            standing.finalist ? "ja" : "",
            standing.rounds.pflicht?.total,
            standing.rounds.kuer?.total,
            standing.rounds.finale?.total,
            standing.total,
            athlete.lastName,
            athlete.firstName,
            athlete.birthYear || undefined,
            athlete.pflichtLevel ?? undefined,
            athletePflichtDeduction(athlete, competition),
            ...roundCells,
          ]
            .map(cell)
            .join(";"),
        );
      }
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
