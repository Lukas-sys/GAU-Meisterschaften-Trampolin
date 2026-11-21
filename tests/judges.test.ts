import { describe, expect, it } from "vitest";
import {
  assignJudgeSeat,
  createCompetition,
  judgeOnSeat,
  judgeSeats,
  seatedJudges,
  updateJudge,
  type Competition,
} from "../src/core";

function competition(): Competition {
  return {
    ...createCompetition({ name: "Test", date: "2026-11-21", location: "Ort" }),
    judges: [
      { id: "a", name: "Anna", club: "TV A" },
      { id: "b", name: "Bernd", club: "TV B" },
      { id: "c", name: "Carla", club: "TV C" },
    ],
  };
}

describe("judgeSeats", () => {
  it("richtet sich nach dem Kampfgericht", () => {
    expect(judgeSeats({ executionJudges: 4, hdJudges: 2, timeOfFlight: false })).toEqual([
      "E1", "E2", "E3", "E4", "HD1", "HD2", "D",
    ]);
    expect(judgeSeats({ executionJudges: 3, hdJudges: 0, timeOfFlight: true })).toEqual(["E1", "E2", "E3", "D", "ToF"]);
  });
});

describe("assignJudgeSeat", () => {
  it("besetzt jeden Platz nur einmal", () => {
    let c = assignJudgeSeat(competition(), "a", "E1");
    c = assignJudgeSeat(c, "b", "E1");
    expect(judgeOnSeat(c, "E1")?.name).toBe("Bernd");
    expect(c.judges.find((j) => j.id === "a")?.seat).toBeUndefined();
  });

  it("verschiebt eine Person auf einen anderen Platz und trägt sie aus", () => {
    let c = assignJudgeSeat(competition(), "a", "E1");
    c = assignJudgeSeat(c, "a", "HD2");
    expect(judgeOnSeat(c, "E1")).toBeUndefined();
    expect(judgeOnSeat(c, "HD2")?.name).toBe("Anna");
    c = assignJudgeSeat(c, "a", undefined);
    expect(judgeOnSeat(c, "HD2")).toBeUndefined();
  });

  it("listet das Kampfgericht in Platzreihenfolge, ohne Plätze, die es nicht mehr gibt", () => {
    let c = assignJudgeSeat(competition(), "c", "D");
    c = assignJudgeSeat(c, "a", "E2");
    c = assignJudgeSeat(c, "b", "ToF");
    expect(seatedJudges(c).map((s) => `${s.seat} ${s.judge.name}`)).toEqual(["E2 Anna", "D Carla"]);
  });
});

describe("updateJudge", () => {
  it("korrigiert Namen und behält den Platz", () => {
    const c = updateJudge(assignJudgeSeat(competition(), "a", "E1"), "a", { name: "Anna Muster" });
    expect(judgeOnSeat(c, "E1")?.name).toBe("Anna Muster");
  });
});
