import { describe, expect, it } from "vitest";
import {
  applyImport,
  createCompetition,
  parseBirthYear,
  parseClassId,
  parseMeldebogen,
  parsePflichtLevel,
  type SheetGrid,
} from "../src/core";
import sheets from "./fixtures/meldebogen-beispiel.sheets.json";

const grid = sheets as SheetGrid[];
const parse = () => parseMeldebogen(grid, "meldebogen-beispiel.xlsx", 2026);

describe("Meldebogen einlesen", () => {
  it("erkennt Verein, Mannschaften, Klassen und Kampfrichter", () => {
    const result = parse();
    expect(result.club).toBe("TV Musterstadt");
    expect(result.teams.map((t) => [t.number, t.classId, t.athletes.length])).toEqual([
      [1, "OK", 7],
      [2, "NK", 5],
    ]);
    expect(result.judges).toEqual(["Richter, Rita", "Wertung, Walter"]);
    expect(result.warnings).toEqual([]);
  });

  it("liest Turner:innen mit Pflichtstufe und Startplätzen", () => {
    const [ok, nk] = parse().teams;
    expect(ok.athletes[0]).toMatchObject({
      lastName: "Muster",
      firstName: "Anna",
      birthYear: 2008,
      pflichtLevel: "M4",
      startPositions: { pflicht: 1, kuer: 2, finale: 3 },
    });
    expect(ok.athletes[6]).toMatchObject({ lastName: "Ersatz", startPositions: {} });
    expect(nk.athletes[0].startPositions).toEqual({ pflicht: 1, kuer: 1 });
  });

  it("meldet fehlende Klasse und unbekannte Werte", () => {
    const broken = structuredClone(grid);
    const rows = broken[0].rows;
    rows[6][0] = "Klasse:  ";
    rows[8][3] = "M9x";
    rows[9][2] = "abc";
    rows[10][4] = "x";
    const result = parseMeldebogen(broken, "kaputt.xlsx", 2026);
    expect(result.teams[0].classId).toBeNull();
    expect(result.warnings).toEqual([
      "1. Mannschaft, Anna Muster: Pflichtstufe „M9x“ unbekannt.",
      "1. Mannschaft, Ben Beispiel: Jahrgang „abc“ nicht lesbar.",
      "1. Mannschaft, Clara Probe: Startplatz „x“ nicht lesbar.",
      "1. Mannschaft: Klasse (OK/NK) nicht angegeben, bitte auswählen.",
    ]);
  });

  it("findet keine Mannschaften in der leeren Vorlage", () => {
    const empty = structuredClone(grid);
    empty[0].rows = empty[0].rows.map((row, r) => row.map((cell, c) => (r > 7 && c < 7 && ![16, 17, 26, 27, 36, 37, 47, 48, 49].includes(r) ? null : cell)));
    empty[0].rows[2][0] = "Verein :__________________________";
    const result = parseMeldebogen(empty, "leer.xls", 2026);
    expect(result.teams).toEqual([]);
    expect(result.warnings).toEqual([
      "Vereinsname nicht gefunden, bitte eintragen.",
      "Keine Mannschaft mit Turner:innen gefunden.",
    ]);
  });
});

describe("Einzelwerte", () => {
  it.each([
    ["Klasse: OK", "OK"], ["Klasse: nk", "NK"], ["Offene Klasse", "OK"], ["Nachwuchs", "NK"], ["Klasse:", null],
  ])("Klasse %s → %s", (input, expected) => expect(parseClassId(input)).toBe(expected));

  it.each([
    ["m4", "M4"], ["M 6", "M6"], ["M8", "M8"], ["m10", "M10"], ["M6+", "M6"], ["M11", null], ["p3", "P3"], ["", null], ["Kür", null],
  ])("Pflichtstufe %s → %s", (input, expected) => expect(parsePflichtLevel(input)).toBe(expected));

  it.each([
    [2010, 2010], ["2012", 2012], [12, 2012], ["98", 1998], ["", null], ["zwei", null],
  ])("Jahrgang %s → %s", (input, expected) => expect(parseBirthYear(input, 2026)).toBe(expected));
});

describe("Import übernehmen", () => {
  it("legt neue Mannschaften an und ersetzt bestehende", () => {
    const competition = createCompetition({ name: "GVM", date: "2026-11-21", location: "Linkenheim" });
    const first = applyImport(competition, [parse()]);
    expect(first.summary).toEqual({ added: 2, replaced: 0 });
    expect(first.competition.judges.map((j) => j.name)).toEqual(["Richter, Rita", "Wertung, Walter"]);

    const second = applyImport(first.competition, [parse()]);
    expect(second.summary).toEqual({ added: 0, replaced: 2 });
    expect(second.competition.teams.map((t) => t.id)).toEqual(first.competition.teams.map((t) => t.id));
    expect(second.competition.judges).toHaveLength(2);
  });

  it("überspringt Mannschaften ohne Klasse", () => {
    const parsed = parse();
    parsed.teams[0].classId = null;
    const { summary } = applyImport(createCompetition({ name: "", date: "2026-11-21", location: "" }), [parsed]);
    expect(summary.added).toBe(1);
  });
});
