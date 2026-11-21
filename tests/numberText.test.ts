import { describe, expect, it } from "vitest";
import { formatNumberText, parseNumberText } from "../src/core";

describe("parseNumberText", () => {
  it("liest Dezimalzahlen mit Komma oder Punkt", () => {
    expect(parseNumberText("6,7", { decimal: true })).toBe(6.7);
    expect(parseNumberText("6.7", { decimal: true })).toBe(6.7);
    expect(parseNumberText(" ", { decimal: true })).toBeUndefined();
    expect(parseNumberText("abc", { decimal: true })).toBeUndefined();
  });

  it("verlangt ohne decimal ganze Zahlen", () => {
    expect(parseNumberText("8")).toBe(8);
    expect(parseNumberText("8,5")).toBeUndefined();
  });

  it("liest beim Tippen ohne Komma reine Ziffern als Zehntel", () => {
    const tenths = { decimal: true, tenths: true };
    expect(parseNumberText("67", tenths)).toBe(6.7);
    expect(parseNumberText("100", tenths)).toBe(10);
    expect(parseNumberText("5", tenths)).toBe(0.5);
    expect(parseNumberText("0", tenths)).toBe(0);
    expect(parseNumberText("125", tenths)).toBe(12.5);
  });

  it("nimmt mit Komma oder Punkt den Wert wörtlich, auch beim Tippen ohne Komma", () => {
    const tenths = { decimal: true, tenths: true };
    expect(parseNumberText("6,7", tenths)).toBe(6.7);
    expect(parseNumberText("8.", tenths)).toBe(8);
    expect(parseNumberText("10,0", tenths)).toBe(10);
    expect(parseNumberText("", tenths)).toBeUndefined();
  });
});

describe("formatNumberText", () => {
  it("schreibt Zahlen mit Komma", () => {
    expect(formatNumberText(6.7)).toBe("6,7");
    expect(formatNumberText(10)).toBe("10");
    expect(formatNumberText(undefined)).toBe("");
  });

  it("zeigt Notenfelder mit mindestens einer Nachkommastelle", () => {
    expect(formatNumberText(7, 1)).toBe("7,0");
    expect(formatNumberText(10, 1)).toBe("10,0");
    expect(formatNumberText(6.7, 1)).toBe("6,7");
    expect(formatNumberText(8.25, 1)).toBe("8,25");
    expect(formatNumberText(0, 1)).toBe("0,0");
  });

  it("liest einen angezeigten Wert beim Tippen ohne Komma unverändert zurück", () => {
    const tenths = { decimal: true, tenths: true };
    for (const value of [7, 10, 6.7, 8.25, 0]) {
      expect(parseNumberText(formatNumberText(value, 1), tenths)).toBe(value);
    }
  });
});
