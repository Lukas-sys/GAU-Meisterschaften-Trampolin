import { describe, expect, it } from "vitest";
import { executionScore, hdScore, scoreRoutine, STANDARD_PANEL } from "../src/core";
import { performances } from "./fixture";

describe("Wertung einer Übung", () => {
  it("rechnet jede Übung der Beispiel-Excel nach", () => {
    for (const p of performances) {
      const result = scoreRoutine(p.score, STANDARD_PANEL, p.excelPflichtDeduction);
      expect(result.total, `${p.athleteId} ${p.round}`).toBeCloseTo(p.excelTotal, 6);
    }
  });

  it("streicht bei 4 Haltungsnoten die höchste und niedrigste", () => {
    expect(executionScore([6.8, 6.5, 7.0, 7.3])).toBe(13.8);
  });

  it("ergänzt bei 3 Haltungsnoten den Mittelwert als vierte Note", () => {
    // 6,0 / 6,2 / 7,0 → vierte Note 6,4 → gestrichen 6,0 und 7,0 → 6,2 + 6,4
    expect(executionScore([6.0, 6.2, 7.0])).toBe(12.6);
    expect(executionScore([6.0, 6.3, 6.6])).toBe(12.6);
    // Mittelwert 6,1333… bleibt ungerundet, gerundet wird erst das Ergebnis
    expect(executionScore([6.0, 6.1, 6.3])).toBe(12.233);
  });

  it("streicht bei 5 Haltungsnoten und verdoppelt den Mittelwert der übrigen drei", () => {
    expect(executionScore([5.0, 6.0, 6.3, 6.6, 9.0])).toBe(12.6);
  });

  it("unterscheidet 0, 1 und 2 HD-Kampfrichter", () => {
    expect(hdScore([9.6, 9.7], 0)).toBe(0);
    expect(hdScore([9.6, 9.7], 1)).toBe(9.6);
    expect(hdScore([9.6, 9.7], 2)).toBe(9.65);
  });

  it("zählt ToF nur, wenn es aktiviert ist", () => {
    const input = { execution: [7, 7, 7, 7], hd: [9, 9], timeOfFlight: 12.5 };
    expect(scoreRoutine(input, STANDARD_PANEL).total).toBe(23);
    expect(scoreRoutine(input, { ...STANDARD_PANEL, timeOfFlight: true }).total).toBe(35.5);
  });

  it("zieht Pflichtabzug und sonstige Abzüge ab und addiert die Schwierigkeit", () => {
    const input = { execution: [7, 7, 7, 7], hd: [9, 9], difficulty: 1.5, otherDeduction: 0.3 };
    expect(scoreRoutine(input, STANDARD_PANEL, 0.9).total).toBe(23.3);
  });
});
