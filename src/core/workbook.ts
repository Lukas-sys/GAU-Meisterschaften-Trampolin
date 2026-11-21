/**
 * Inhalt der Excel-Datei mit den Ergebnissen. Die Datei selbst schreibt der Rust-Teil
 * (src-tauri/src/xlsx.rs); hier wird nur festgelegt, was in welcher Zelle steht.
 */
import { athletePflichtDeduction, teamLabel, type Competition } from "./competition";
import { classStartList } from "./draw";
import { classResults } from "./export";
import { seatedJudges } from "./judges";
import { roundScore } from "./math";
import { completedElementsOf, getRoutine, ROUTINE_STATE_LABELS, routineBreakdown, routineState } from "./results";
import type { ClassId, RoundKind } from "./types";
import { ROUND_LABELS } from "./validation";

export type WorkbookValue = string | number | null;
export type WorkbookCell = WorkbookValue | { value: WorkbookValue; bold?: boolean; muted?: boolean };

export interface WorkbookColumn {
  header: string;
  width?: number;
  /** points = Punkte, im Excel mit 2 (bei Bedarf 3) Nachkommastellen. */
  kind?: "points";
}

export interface WorkbookSheet {
  name: string;
  title?: string;
  columns: WorkbookColumn[];
  rows: WorkbookCell[][];
}

export interface WorkbookSpec {
  sheets: WorkbookSheet[];
}

const points = (value: number | undefined): number | null => (value === undefined ? null : roundScore(value));

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

/** Klassen, in denen es Mannschaften gibt. */
function usedClasses(competition: Competition) {
  return Object.values(competition.classes).filter((c) => competition.teams.some((t) => t.classId === c.id));
}

/** Ergebnis je Klasse: eine Zeile je Mannschaft. */
function standingsSheet(competition: Competition, classId: ClassId): WorkbookSheet {
  const config = competition.classes[classId];
  const hasKuer = config.rounds.includes("kuer");
  const hasFinal = config.rounds.includes("finale");
  const columns: WorkbookColumn[] = [
    { header: "Rang", width: 6 },
    { header: "Mannschaft", width: 32 },
    { header: "Pflicht", kind: "points", width: 10 },
    ...(hasKuer ? [{ header: "Kür", kind: "points" as const, width: 10 }] : []),
    { header: "Vorkampf", kind: "points", width: 11 },
    ...(hasFinal
      ? [
          { header: "Finale", kind: "points" as const, width: 10 },
          { header: "Gesamt", kind: "points" as const, width: 10 },
        ]
      : []),
  ];
  const rows = classResults(competition, config.id).map(({ team, standing }) => [
    standing.unresolvedTie ? `${standing.rank} =` : standing.rank,
    teamLabel(team),
    points(standing.rounds.pflicht?.total),
    ...(hasKuer ? [points(standing.rounds.kuer?.total)] : []),
    points(standing.vorkampf),
    ...(hasFinal
      ? [
          standing.finalist ? points(standing.rounds.finale?.total) : null,
          { value: points(standing.total), bold: true },
        ]
      : []),
  ]);
  return { name: config.name, title: `${config.name} · Ergebnis`, columns, rows };
}

/** Alle Turner:innen mit ihren Punkten je Durchgang; gewertete Übungen fett. */
function athletesSheet(competition: Competition): WorkbookSheet {
  const rounds: RoundKind[] = ["pflicht", "kuer", "finale"];
  const columns: WorkbookColumn[] = [
    { header: "Klasse", width: 12 },
    { header: "Rang", width: 6 },
    { header: "Mannschaft", width: 28 },
    { header: "Name", width: 18 },
    { header: "Vorname", width: 14 },
    { header: "Jahrgang", width: 9 },
    { header: "Pflichtstufe", width: 11 },
    { header: "Pflichtabzug", kind: "points", width: 11 },
    ...rounds.map((r) => ({ header: ROUND_LABELS[r], kind: "points" as const, width: 10 })),
  ];
  const rows: WorkbookCell[][] = [];
  for (const config of usedClasses(competition)) {
    for (const { team, standing, athletes } of classResults(competition, config.id)) {
      for (const { athlete, rounds: results } of athletes) {
        rows.push([
          config.name,
          standing.rank,
          teamLabel(team),
          athlete.lastName,
          athlete.firstName,
          athlete.birthYear || null,
          athlete.pflichtLevel,
          athletePflichtDeduction(athlete, competition) ?? null,
          ...rounds.map((r): WorkbookCell => {
            const result = results[r];
            if (!result) return null;
            if (result.absent) return { value: "n. a.", muted: true };
            return { value: points(result.total), bold: result.counted };
          }),
        ]);
      }
    }
  }
  return { name: "Einzelwertungen", title: "Einzelwertungen (fett = zählt für die Mannschaft)", columns, rows };
}

/** Alle Noten jeder Übung in Startreihenfolge, wie im Kampfrichterbogen. */
function routinesSheet(competition: Competition): WorkbookSheet {
  const { panel } = competition;
  const executionCount = Math.max(panel.executionJudges, 1);
  const columns: WorkbookColumn[] = [
    { header: "Klasse", width: 12 },
    { header: "Durchgang", width: 10 },
    { header: "Nr", width: 5 },
    { header: "Name", width: 18 },
    { header: "Vorname", width: 14 },
    { header: "Mannschaft", width: 28 },
    { header: "Status", width: 16 },
    ...Array.from({ length: executionCount }, (_, i) => ({ header: `E${i + 1}`, width: 7 })),
    { header: "Haltung", kind: "points", width: 9 },
    ...Array.from({ length: panel.hdJudges }, (_, i) => ({ header: `HD${i + 1}`, width: 7 })),
    ...(panel.hdJudges > 0 ? [{ header: "HD", kind: "points" as const, width: 8 }] : []),
    { header: "D", kind: "points", width: 7 },
    ...(panel.timeOfFlight ? [{ header: "ToF", kind: "points" as const, width: 8 }] : []),
    { header: "Pflichtabzug", kind: "points", width: 11 },
    { header: "Sonst. Abzug", kind: "points", width: 11 },
    { header: "Punkte", kind: "points", width: 9 },
    { header: "ab", width: 5 },
  ];
  const rows: WorkbookCell[][] = [];
  for (const config of usedClasses(competition)) {
    for (const round of config.rounds) {
      for (const row of classStartList(competition, config.id, round)) {
        const entry = getRoutine(competition, round, row.athlete.id);
        const state = routineState(entry, panel);
        const breakdown = routineBreakdown(competition, row.athlete, round, entry);
        const absent = state === "absent";
        const note = (values: (number | null)[] | undefined, i: number) => (absent ? null : (values?.[i] ?? null));
        rows.push([
          config.name,
          ROUND_LABELS[round],
          row.startNumber,
          row.athlete.lastName,
          row.athlete.firstName,
          teamLabel(row.team),
          state === "scored" ? null : { value: ROUTINE_STATE_LABELS[state], muted: true },
          ...Array.from({ length: executionCount }, (_, i) => note(entry?.execution, i)),
          points(breakdown?.execution),
          ...Array.from({ length: panel.hdJudges }, (_, i) => note(entry?.hd, i)),
          ...(panel.hdJudges > 0 ? [points(breakdown?.hd)] : []),
          absent ? null : (entry?.difficulty ?? null),
          ...(panel.timeOfFlight ? [absent ? null : (entry?.timeOfFlight ?? null)] : []),
          round === "pflicht" ? (row.pflichtDeduction ?? null) : null,
          absent ? null : (entry?.otherDeduction ?? null),
          { value: points(breakdown?.total), bold: true },
          absent || state === "open" ? null : completedElementsOf(entry),
        ]);
      }
    }
  }
  return { name: "Übungen", title: "Alle Übungen mit Noten", columns, rows };
}

function infoSheet(competition: Competition): WorkbookSheet {
  const { panel } = competition;
  return {
    name: "Wettkampf",
    title: competition.name,
    columns: [
      { header: "Angabe", width: 26 },
      { header: "Wert", width: 50 },
    ],
    rows: [
      ["Datum", formatDate(competition.date)],
      ["Ort", competition.location],
      ["Haltungs-Kampfrichter:innen", panel.executionJudges],
      ["HD-Kampfrichter:innen", panel.hdJudges],
      ["Flugzeit (ToF)", panel.timeOfFlight ? "ja" : "nein"],
      ...seatedJudges(competition).map(({ seat, judge }): WorkbookCell[] => [
        `Kampfgericht ${seat}`,
        [judge.name, judge.club].filter(Boolean).join(", "),
      ]),
      ...usedClasses(competition).map((c): WorkbookCell[] => [
        c.name,
        `${competition.teams.filter((t) => t.classId === c.id).length} Mannschaften`,
      ]),
      ["Erstellt", new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })],
    ],
  };
}

/** Ergebnisse als Excel: Ergebnis je Klasse, Einzelwertungen, alle Übungen, Wettkampfangaben. */
export function resultsWorkbook(competition: Competition): WorkbookSpec {
  return {
    sheets: [
      ...usedClasses(competition).map((c) => standingsSheet(competition, c.id)),
      athletesSheet(competition),
      routinesSheet(competition),
      infoSheet(competition),
    ],
  };
}
