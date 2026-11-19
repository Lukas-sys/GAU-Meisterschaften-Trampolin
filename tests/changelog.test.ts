import changelog from "../CHANGELOG.md?raw";
import { describe, expect, it } from "vitest";
import { changelogSection, changelogSections, parseMarkdown } from "../src/core";

const SAMPLE = `# Changelog

Einleitung.

## [Unveröffentlicht]

## [1.1.0] – 2026-12-01

### Hinzugefügt
- Neu A
  - Detail A1
  - Detail A2
- Neu B
  mit Fortsetzung

### Behoben
- Fehler C

## [1.0.0] – 2026-11-21

- Erste Version
`;

describe("changelogSections", () => {
  it("teilt nach Versionen und erkennt die Versionsnummer", () => {
    const sections = changelogSections(SAMPLE);
    expect(sections.map((s) => [s.version, s.title])).toEqual([
      [null, "[Unveröffentlicht]"],
      ["1.1.0", "[1.1.0] – 2026-12-01"],
      ["1.0.0", "[1.0.0] – 2026-11-21"],
    ]);
    expect(sections[0].body).toBe("");
    expect(sections[1].body.startsWith("### Hinzugefügt")).toBe(true);
    expect(sections[1].body).toContain("- Fehler C");
    expect(sections[1].body).not.toContain("Erste Version");
  });

  it("findet eine Version auch mit v davor", () => {
    expect(changelogSection(SAMPLE, "v1.0.0")?.body).toBe("- Erste Version");
    expect(changelogSection(SAMPLE, "2.0.0")).toBeUndefined();
  });

  it("liest das echte CHANGELOG.md", () => {
    const sections = changelogSections(changelog);
    expect(sections[0].title).toBe("[Unveröffentlicht]");
  });
});

describe("parseMarkdown", () => {
  it("erkennt Überschriften, verschachtelte Listen und Fortsetzungszeilen", () => {
    const blocks = parseMarkdown(changelogSection(SAMPLE, "1.1.0")!.body);
    expect(blocks).toEqual([
      { type: "heading", level: 3, text: "Hinzugefügt" },
      {
        type: "list",
        items: [
          {
            text: "Neu A",
            children: [
              { text: "Detail A1", children: [] },
              { text: "Detail A2", children: [] },
            ],
          },
          { text: "Neu B mit Fortsetzung", children: [] },
        ],
      },
      { type: "heading", level: 3, text: "Behoben" },
      { type: "list", items: [{ text: "Fehler C", children: [] }] },
    ]);
  });

  it("macht aus normalen Zeilen Absätze", () => {
    expect(parseMarkdown("Zeile eins\nZeile zwei\n\nNeuer Absatz")).toEqual([
      { type: "paragraph", text: "Zeile eins Zeile zwei" },
      { type: "paragraph", text: "Neuer Absatz" },
    ]);
  });
});
