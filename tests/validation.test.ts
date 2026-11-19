import { describe, expect, it } from "vitest";
import {
  createAthlete,
  createCompetition,
  createTeam,
  parseCompetition,
  serializeCompetition,
  validateCompetition,
  type Athlete,
  type ClassId,
} from "../src/core";

function competitionWith(classId: ClassId, athletes: Partial<Athlete>[]) {
  const competition = createCompetition({ name: "GVM", date: "2026-11-21", location: "Linkenheim" });
  competition.teams.push(
    createTeam({ club: "TV Test", classId, athletes: athletes.map((a) => createAthlete(a)) }),
  );
  return competition;
}

const valid = (n: number, extra: Partial<Athlete> = {}): Partial<Athlete> => ({
  lastName: `Person${n}`, firstName: "Test", birthYear: 2010, pflichtLevel: "M3",
  startPositions: { pflicht: n, kuer: n }, ...extra,
});

const messages = (c: ReturnType<typeof competitionWith>) => validateCompetition(c).map((i) => `${i.severity}: ${i.message}`);

describe("Prüfung der Meldungen", () => {
  it("akzeptiert eine vollständige Mannschaft", () => {
    expect(messages(competitionWith("OK", [1, 2, 3, 4].map((n) => valid(n))))).toEqual([]);
  });

  it("findet doppelte Startplätze, zu viele Starter und Lücken", () => {
    const athletes = [1, 2, 3, 4, 5, 6].map((n) => valid(n));
    athletes.push(valid(7, { startPositions: { pflicht: 6, kuer: 6 } }));
    athletes.push(valid(9, { startPositions: {} }), valid(10, { startPositions: {} }));
    expect(messages(competitionWith("OK", athletes))).toEqual([
      "error: TV Test 1: 9 Turner:innen, erlaubt sind 8.",
      "error: TV Test 1, Pflicht: 7 Starter:innen, erlaubt sind 6.",
      "error: TV Test 1, Pflicht: Startplatz 6 ist mehrfach vergeben.",
      "error: TV Test 1, Kür: 7 Starter:innen, erlaubt sind 6.",
      "error: TV Test 1, Kür: Startplatz 6 ist mehrfach vergeben.",
    ]);
  });

  it("warnt bei zu wenigen Startern und zu alten Kindern in der NK", () => {
    const athletes = [valid(1, { birthYear: 2014 }), valid(2, { birthYear: 2017 })];
    expect(messages(competitionWith("NK", athletes))).toEqual([
      "warning: TV Test 1, Pflicht: nur 2 Starter:innen, gewertet werden 4.",
      "warning: TV Test 1, Kür: nur 2 Starter:innen, gewertet werden 4.",
      "warning: Test Person1: Jahrgang 2014 ist für die Nachwuchsklasse zu alt (max. 10 Jahre).",
    ]);
  });

  it("verlangt Name, Jahrgang und Pflichtstufe", () => {
    const athletes = [1, 2, 3].map((n) => valid(n));
    athletes.push(valid(4, { lastName: "", firstName: "", birthYear: 0, pflichtLevel: null }));
    expect(messages(competitionWith("OK", athletes))).toEqual([
      "error: TV Test 1: Name fehlt.",
      "error: Unbenannte Person: Jahrgang fehlt oder ist ungültig.",
      "error: Unbenannte Person: Pflichtstufe fehlt.",
    ]);
  });

  it("warnt bei Finale-Startplätzen in der NK", () => {
    const athletes = [1, 2, 3, 4].map((n) => valid(n, { birthYear: 2017, startPositions: { pflicht: n, kuer: n, finale: n } }));
    expect(messages(competitionWith("NK", athletes))).toHaveLength(4);
  });

  it("findet doppelte Mannschaften und Personen", () => {
    const competition = competitionWith("OK", [1, 2, 3, 4].map((n) => valid(n)));
    competition.teams.push({ ...structuredClone(competition.teams[0]), id: "kopie" });
    expect(messages(competition)).toEqual([
      "error: TV Test 1 gibt es in der Klasse OK doppelt.",
      ...[1, 2, 3, 4].map((n) => `warning: Test Person${n} ist in TV Test 1 und TV Test 1 gemeldet.`),
    ]);
  });
});

describe("Wettkampfdatei", () => {
  it("speichert und lädt verlustfrei", () => {
    const competition = competitionWith("OK", [valid(1)]);
    expect(parseCompetition(serializeCompetition(competition))).toEqual(competition);
  });

  it("lehnt fremde oder neuere Dateien ab", () => {
    expect(() => parseCompetition("kein json")).toThrow("keine gültige Wettkampfdatei");
    expect(() => parseCompetition('{"formatVersion": 99, "teams": []}')).toThrow("Format 99");
  });
});
