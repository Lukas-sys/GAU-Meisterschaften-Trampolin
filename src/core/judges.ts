import type { Competition, Judge } from "./competition";
import type { JudgePanel } from "./types";

/** Plätze im Kampfgericht laut Einstellung: E1..En, HD1..HDk, D und ggf. ToF. */
export function judgeSeats(panel: JudgePanel): string[] {
  return [
    ...Array.from({ length: panel.executionJudges }, (_, i) => `E${i + 1}`),
    ...Array.from({ length: panel.hdJudges }, (_, i) => `HD${i + 1}`),
    "D",
    ...(panel.timeOfFlight ? ["ToF"] : []),
  ];
}

/** Wer auf einem Platz sitzt; undefined = nicht besetzt. */
export function judgeOnSeat(competition: Pick<Competition, "judges">, seat: string): Judge | undefined {
  return competition.judges.find((j) => j.seat === seat);
}

/**
 * Teilt eine Kampfrichter:in einem Platz zu (undefined = keinem). Ein Platz ist immer nur
 * einmal besetzt: Wer dort vorher saß, wird ausgetragen.
 */
export function assignJudgeSeat(competition: Competition, judgeId: string, seat: string | undefined): Competition {
  return {
    ...competition,
    judges: competition.judges.map((j) => {
      if (j.id === judgeId) return { ...j, seat };
      if (seat !== undefined && j.seat === seat) return { ...j, seat: undefined };
      return j;
    }),
  };
}

/** Ändert Name oder Verein einer Kampfrichter:in. */
export function updateJudge(competition: Competition, judgeId: string, change: Partial<Omit<Judge, "id">>): Competition {
  return { ...competition, judges: competition.judges.map((j) => (j.id === judgeId ? { ...j, ...change } : j)) };
}

/** Kampfgericht in Platzreihenfolge, nur besetzte Plätze: „E1 Name“ usw. */
export function seatedJudges(competition: Competition): { seat: string; judge: Judge }[] {
  return judgeSeats(competition.panel).flatMap((seat) => {
    const judge = judgeOnSeat(competition, seat);
    return judge ? [{ seat, judge }] : [];
  });
}
