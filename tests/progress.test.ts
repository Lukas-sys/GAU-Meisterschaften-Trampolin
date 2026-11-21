import { describe, expect, it } from "vitest";
import { appendMissingTeams, createCompetition, emptyRoutine, openRoutines, setRoutine, type Competition } from "../src/core";
import { teams } from "./fixture";

function competition(): Competition {
  return appendMissingTeams({ ...createCompetition({ name: "Test", date: "2026-11-21", location: "Ort" }), teams }, "NK");
}

describe("openRoutines", () => {
  it("liefert alle Übungen der Startliste, solange nichts eingetragen ist", () => {
    const c = competition();
    const open = openRoutines(c, "NK", "pflicht");
    expect(open.length).toBeGreaterThan(3);
    expect(open.map((r) => r.startNumber)).toEqual(open.map((_, i) => i + 1));
  });

  it("zählt gewertete und nicht angetretene Übungen als erledigt, unvollständige als offen", () => {
    let c = competition();
    const [first, second, third] = openRoutines(c, "NK", "pflicht");
    c = setRoutine(c, "pflicht", first.athlete.id, { ...emptyRoutine(c.panel), execution: [8, 8, 8, 8], hd: [9, 9] });
    c = setRoutine(c, "pflicht", second.athlete.id, { ...emptyRoutine(c.panel), status: "absent" });
    c = setRoutine(c, "pflicht", third.athlete.id, { ...emptyRoutine(c.panel), execution: [8, null, null, null] });
    const numbers = openRoutines(c, "NK", "pflicht").map((r) => r.startNumber);
    expect(numbers).not.toContain(first.startNumber);
    expect(numbers).not.toContain(second.startNumber);
    expect(numbers[0]).toBe(third.startNumber);
  });

  it("ist leer ohne Mannschaftsreihenfolge oder für einen Durchgang, den die Klasse nicht hat", () => {
    const c = { ...createCompetition({ name: "Test", date: "2026-11-21", location: "Ort" }), teams };
    expect(openRoutines(c, "NK", "pflicht")).toEqual([]);
    expect(openRoutines(competition(), "NK", "finale")).toEqual([]);
  });
});
