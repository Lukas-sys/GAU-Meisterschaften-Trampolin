import { roundScore } from "./math";
import { PFLICHT_LEVELS, type PflichtLevel } from "./types";

/**
 * Welche Pflichtstufe ab welchem Alter mindestens erwartet wird.
 * Alter = Wettkampfjahr − Jahrgang. Es gilt der Eintrag mit dem höchsten passenden minAge.
 */
export interface PflichtDeductionTable {
  stepDeduction: number;
  maxDeduction: number;
  requirements: { minAge: number; requiredLevel: PflichtLevel }[];
}

/** Tabelle aus der Ausschreibung der GVM 2026. */
export const PFLICHT_DEDUCTION_TABLE_2026: PflichtDeductionTable = {
  stepDeduction: 0.9,
  maxDeduction: 3.6,
  requirements: [
    { minAge: 0, requiredLevel: "P3" },
    { minAge: 9, requiredLevel: "M0" },
    { minAge: 10, requiredLevel: "M1" },
    { minAge: 11, requiredLevel: "M2" },
    { minAge: 12, requiredLevel: "M3" },
    { minAge: 14, requiredLevel: "M4" },
    { minAge: 16, requiredLevel: "M5" },
    { minAge: 18, requiredLevel: "M6" },
  ],
};

export function requiredLevel(age: number, table: PflichtDeductionTable): PflichtLevel {
  const applicable = table.requirements.filter((r) => age >= r.minAge);
  if (applicable.length === 0) return PFLICHT_LEVELS[0];
  return applicable.reduce((best, r) => (r.minAge >= best.minAge ? r : best)).requiredLevel;
}

export function pflichtDeduction(
  birthYear: number,
  level: PflichtLevel,
  competitionYear: number,
  table: PflichtDeductionTable = PFLICHT_DEDUCTION_TABLE_2026,
): number {
  const age = competitionYear - birthYear;
  const missingLevels =
    PFLICHT_LEVELS.indexOf(requiredLevel(age, table)) - PFLICHT_LEVELS.indexOf(level);
  if (missingLevels <= 0) return 0;
  return Math.min(roundScore(missingLevels * table.stepDeduction), table.maxDeduction);
}

