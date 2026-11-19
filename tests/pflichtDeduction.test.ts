import { describe, expect, it } from "vitest";
import { pflichtDeduction, type PflichtLevel } from "../src/core";

/** Tabelle aus der Ausschreibung 2026: Jahrgang → Abzug je Pflichtstufe. */
const TABLE_2026: [number, Partial<Record<PflichtLevel, number>>][] = [
  [2018, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0, M1: 0, M0: 0, P3: 0 }],
  [2017, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0, M1: 0, M0: 0, P3: 0.9 }],
  [2016, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0, M1: 0, M0: 0.9, P3: 1.8 }],
  [2015, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0, M1: 0.9, M0: 1.8, P3: 2.7 }],
  [2014, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0.9, M1: 1.8, M0: 2.7, P3: 3.6 }],
  [2013, { M6: 0, M5: 0, M4: 0, M3: 0, M2: 0.9, M1: 1.8, M0: 2.7, P3: 3.6 }],
  [2012, { M6: 0, M5: 0, M4: 0, M3: 0.9, M2: 1.8, M1: 2.7, M0: 3.6, P3: 3.6 }],
  [2011, { M6: 0, M5: 0, M4: 0, M3: 0.9, M2: 1.8, M1: 2.7, M0: 3.6, P3: 3.6 }],
  [2010, { M6: 0, M5: 0, M4: 0.9, M3: 1.8, M2: 2.7, M1: 3.6, M0: 3.6, P3: 3.6 }],
  [2009, { M6: 0, M5: 0, M4: 0.9, M3: 1.8, M2: 2.7, M1: 3.6, M0: 3.6, P3: 3.6 }],
  [2008, { M6: 0, M5: 0.9, M4: 1.8, M3: 2.7, M2: 3.6, M1: 3.6, M0: 3.6, P3: 3.6 }],
  [1990, { M6: 0, M5: 0.9, M4: 1.8, M3: 2.7, M2: 3.6, M1: 3.6, M0: 3.6, P3: 3.6 }],
];

describe("Pflichtabzug", () => {
  it.each(TABLE_2026)("entspricht der Ausschreibung für Jahrgang %i", (year, expected) => {
    for (const [level, deduction] of Object.entries(expected)) {
      expect(pflichtDeduction(year, level as PflichtLevel, 2026), level).toBe(deduction);
    }
  });

  it("zieht ab M6 nie etwas ab", () => {
    for (const level of ["M6", "M7", "M8", "M9", "M10"] as const) {
      expect(pflichtDeduction(1990, level, 2026)).toBe(0);
    }
  });

  it("verschiebt sich mit dem Wettkampfjahr", () => {
    expect(pflichtDeduction(2018, "P3", 2027)).toBe(0.9);
  });
});

describe("eigene Abzugstabelle", () => {
  it("nutzt den passenden Eintrag unabhängig von der Reihenfolge", () => {
    const table = {
      stepDeduction: 1,
      maxDeduction: 2,
      requirements: [
        { minAge: 12, requiredLevel: "M3" as const },
        { minAge: 0, requiredLevel: "P3" as const },
      ],
    };
    expect(pflichtDeduction(2015, "M1", 2026, table)).toBe(0);
    expect(pflichtDeduction(2014, "M1", 2026, table)).toBe(2);
    expect(pflichtDeduction(2014, "M2", 2026, table)).toBe(1);
  });
});
