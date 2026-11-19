import type { ClassConfig } from "./types";

/** Standardwerte laut Ausschreibung 2026. Alles ist pro Wettkampf änderbar. */
export const DEFAULT_CLASSES: Record<ClassConfig["id"], ClassConfig> = {
  OK: {
    id: "OK",
    name: "Offene Klasse",
    maxTeamSize: 8,
    maxAge: null,
    maxStartersPerRound: 6,
    countingScores: 4,
    rounds: ["pflicht", "kuer", "finale"],
    finalQualification: { fraction: 2 / 3, maxTeams: 5 },
  },
  NK: {
    id: "NK",
    name: "Nachwuchsklasse",
    maxTeamSize: 8,
    maxAge: 10,
    maxStartersPerRound: 6,
    countingScores: 4,
    rounds: ["pflicht", "kuer"],
    finalQualification: null,
  },
};
