import { describe, expect, it } from "vitest";
import { buildStartList, drawOrder, finalTeamOrder } from "../src/core";
import { excelStartOrder, teams } from "./fixture";

describe("Startreihenfolge", () => {
  it.each(["pflicht", "kuer"] as const)("entspricht der Excel im Durchgang %s", (round) => {
    const list = buildStartList(teams, round);
    expect(list.map((e) => e.athleteId)).toEqual(excelStartOrder[round]);
    expect(list.map((e) => e.startNumber)).toEqual(list.map((_, i) => i + 1));
  });

  it("folgt der gelosten Mannschaftsreihenfolge", () => {
    const [a, b, c] = teams;
    const list = buildStartList([c, a, b], "pflicht");
    expect(list.slice(0, 3).map((e) => e.teamId)).toEqual([c.id, a.id, b.id]);
  });

  it("lässt im Finale die schwächste Mannschaft zuerst springen", () => {
    expect(finalTeamOrder(["Erster", "Zweiter", "Dritter"])).toEqual(["Dritter", "Zweiter", "Erster"]);
  });

  it("lost eine vollständige Reihenfolge ohne Duplikate", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const drawn = drawOrder(["A", "B", "C", "D", "E"], random);
    expect([...drawn].sort()).toEqual(["A", "B", "C", "D", "E"]);
  });
});
