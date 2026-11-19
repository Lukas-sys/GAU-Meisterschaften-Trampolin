import { createAthlete, createTeam, newId, type Competition, type Judge } from "./competition";
import { PFLICHT_LEVELS, type Athlete, type ClassId, type PflichtLevel, type RoundKind, type Team } from "./types";

/** Zellraster, wie es die Desktop-Hülle aus .xls/.xlsx liest (Zeile 0 = Excel-Zeile 1). */
export type CellValue = string | number | boolean | null;
export interface SheetGrid {
  name: string;
  rows: CellValue[][];
}

export interface ParsedTeam {
  number: number;
  classId: ClassId | null;
  athletes: Athlete[];
}

export interface ParsedMeldebogen {
  fileName: string;
  club: string;
  teams: ParsedTeam[];
  judges: string[];
  warnings: string[];
}

const text = (cell: CellValue | undefined): string =>
  cell === null || cell === undefined ? "" : String(cell).trim();

const POSITION_COLUMNS: [RoundKind, RegExp][] = [
  ["kuer", /^1\.?\s*k(ü|ue)r$/i],
  ["finale", /^2\.?\s*k(ü|ue)r$/i],
];

interface HeaderColumns {
  lastName: number;
  firstName: number;
  birthYear: number;
  level: number;
  positions: Partial<Record<RoundKind, number>>;
}

function readHeader(row: CellValue[]): HeaderColumns | null {
  const cells = row.map(text);
  const lastName = cells.findIndex((c) => /^name$/i.test(c));
  if (lastName === -1) return null;
  const pflicht = cells.flatMap((c, i) => (/^pflicht$/i.test(c) ? [i] : []));
  const positions: HeaderColumns["positions"] = {};
  if (pflicht[1] !== undefined) positions.pflicht = pflicht[1];
  for (const [round, pattern] of POSITION_COLUMNS) {
    const index = cells.findIndex((c) => pattern.test(c));
    if (index !== -1) positions[round] = index;
  }
  return {
    lastName,
    firstName: cells.findIndex((c) => /^vorname$/i.test(c)),
    birthYear: cells.findIndex((c) => /^(jg|jahrgang)$/i.test(c)),
    level: pflicht[0] ?? -1,
    positions,
  };
}

export function parseClassId(value: string): ClassId | null {
  const v = value.replace(/klasse\s*:/i, "").trim();
  if (/\bNK\b|nachwuchs/i.test(v)) return "NK";
  if (/\bOK\b|offen/i.test(v)) return "OK";
  return null;
}

export function parsePflichtLevel(value: CellValue): PflichtLevel | null {
  const v = text(value).toUpperCase().replace(/\s+/g, "");
  if (!v) return null;
  if (v === "M6+") return "M6";
  return (PFLICHT_LEVELS as readonly string[]).includes(v) ? (v as PflichtLevel) : null;
}

export function parseBirthYear(value: CellValue, referenceYear: number): number | null {
  if (text(value) === "") return null;
  const n = typeof value === "number" ? value : Number(text(value));
  if (!Number.isInteger(n) || n < 0) return null;
  if (n >= 1000) return n;
  if (n < 100) {
    const century = Math.floor(referenceYear / 100) * 100;
    return century + n > referenceYear ? century - 100 + n : century + n;
  }
  return null;
}

function parsePosition(value: CellValue): number | null | "invalid" {
  const raw = text(value);
  if (raw === "" || raw === "0" || raw === "-") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}

function findClub(rows: CellValue[][]): string {
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const match = /\bverein\s*:(.*)$/i.exec(text(row[i]));
      if (!match) continue;
      const inline = match[1].replace(/_/g, "").trim();
      if (inline) return inline;
      const next = row.slice(i + 1).map(text).find((c) => c.replace(/_/g, "").trim());
      return next?.replace(/_/g, "").trim() ?? "";
    }
  }
  return "";
}

function findJudges(rows: CellValue[][]): string[] {
  const start = rows.findIndex((row) => row.some((c) => /kampfrichter\s*:/i.test(text(c))));
  if (start === -1) return [];
  const names: string[] = [];
  for (const row of rows.slice(start)) {
    for (const cell of row) {
      const value = text(cell).replace(/^.*kampfrichter\s*:/i, "").replace(/_/g, "").trim();
      if (value) names.push(value);
    }
  }
  return names;
}

function parseAthleteRow(
  row: CellValue[],
  header: HeaderColumns,
  referenceYear: number,
  warnings: string[],
  where: string,
): Athlete | null {
  const lastName = text(row[header.lastName]);
  const firstName = header.firstName === -1 ? "" : text(row[header.firstName]);
  if (!lastName && !firstName) return null;
  const name = [firstName, lastName].filter(Boolean).join(" ");

  const birthYear = parseBirthYear(row[header.birthYear] ?? null, referenceYear);
  if (birthYear === null) warnings.push(`${where}, ${name}: Jahrgang „${text(row[header.birthYear])}“ nicht lesbar.`);

  const rawLevel = header.level === -1 ? "" : text(row[header.level]);
  const pflichtLevel = parsePflichtLevel(rawLevel);
  if (rawLevel && pflichtLevel === null) warnings.push(`${where}, ${name}: Pflichtstufe „${rawLevel}“ unbekannt.`);
  if (pflichtLevel && rawLevel.endsWith("+")) {
    warnings.push(`${where}, ${name}: Pflichtstufe „${rawLevel}“ als ${pflichtLevel} übernommen, bitte die genaue Stufe prüfen.`);
  }

  const startPositions: Athlete["startPositions"] = {};
  for (const [round, column] of Object.entries(header.positions) as [RoundKind, number][]) {
    const position = parsePosition(row[column] ?? null);
    if (position === "invalid") {
      warnings.push(`${where}, ${name}: Startplatz „${text(row[column])}“ nicht lesbar.`);
    } else if (position !== null) {
      startPositions[round] = position;
    }
  }
  return createAthlete({ lastName, firstName, birthYear: birthYear ?? 0, pflichtLevel, startPositions });
}

/** Liest einen ausgefüllten Meldebogen (Vorlage „Meldebogen_GVM“). */
export function parseMeldebogen(sheets: SheetGrid[], fileName: string, referenceYear: number): ParsedMeldebogen {
  const result: ParsedMeldebogen = { fileName, club: "", teams: [], judges: [], warnings: [] };

  for (const sheet of sheets) {
    const rows = sheet.rows;
    result.club ||= findClub(rows);
    result.judges.push(...findJudges(rows));

    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].map(text);
      if (!cells.some((c) => /^klasse\s*:/i.test(c))) continue;

      const numberMatch = cells.map((c) => /(\d+)\.\s*mannschaft/i.exec(c)).find(Boolean);
      const number = numberMatch ? Number(numberMatch[1]) : result.teams.length + 1;
      const classText = cells.filter((c) => !/mannschaft|startreihenfolge/i.test(c)).join(" ");
      const classId = parseClassId(classText);
      const header = rows[r + 1] ? readHeader(rows[r + 1]) : null;
      if (!header) continue;

      const where = `${number}. Mannschaft`;
      const athletes: Athlete[] = [];
      for (let d = r + 2; d < rows.length; d++) {
        const rowText = rows[d].map(text);
        if (rowText.some((c) => /^klasse\s*:|kampfrichter\s*:|^bitte\b/i.test(c))) break;
        const athlete = parseAthleteRow(rows[d], header, referenceYear, result.warnings, where);
        if (athlete) athletes.push(athlete);
      }
      if (athletes.length === 0) continue;
      if (classId === null) result.warnings.push(`${where}: Klasse (OK/NK) nicht angegeben, bitte auswählen.`);
      result.teams.push({ number, classId, athletes });
    }
  }

  if (!result.club) result.warnings.push("Vereinsname nicht gefunden, bitte eintragen.");
  if (result.teams.length === 0) result.warnings.push("Keine Mannschaft mit Turner:innen gefunden.");
  return result;
}

export interface ImportSummary {
  added: number;
  replaced: number;
}

/**
 * Übernimmt geprüfte Meldungen. Gibt es die Mannschaft (Verein, Nummer, Klasse)
 * schon, werden ihre Turner:innen ersetzt, sonst wird sie neu angelegt.
 */
export function applyImport(
  competition: Competition,
  meldungen: ParsedMeldebogen[],
): { competition: Competition; summary: ImportSummary } {
  const teams: Team[] = [...competition.teams];
  const judges: Judge[] = [...competition.judges];
  const summary: ImportSummary = { added: 0, replaced: 0 };
  const sameClub = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  for (const meldung of meldungen) {
    for (const parsed of meldung.teams) {
      if (parsed.classId === null) continue;
      const index = teams.findIndex(
        (t) => sameClub(t.club, meldung.club) && t.number === parsed.number && t.classId === parsed.classId,
      );
      if (index === -1) {
        teams.push(createTeam({ club: meldung.club, classId: parsed.classId, number: parsed.number, athletes: parsed.athletes }));
        summary.added++;
      } else {
        teams[index] = { ...teams[index], athletes: parsed.athletes };
        summary.replaced++;
      }
    }
    for (const name of meldung.judges) {
      if (!judges.some((j) => j.name === name && sameClub(j.club, meldung.club))) {
        judges.push({ id: newId(), name, club: meldung.club });
      }
    }
  }
  return { competition: { ...competition, teams, judges }, summary };
}
