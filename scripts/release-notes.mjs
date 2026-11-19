// Gibt den CHANGELOG-Abschnitt einer Version aus, z. B. für den Release-Text:
//   node scripts/release-notes.mjs v1.2.0
// Bricht ab, wenn es den Abschnitt nicht gibt oder er leer ist.
import { readFileSync } from "node:fs";
import { changelogSection } from "../src/core/changelog.ts";

const version = process.argv[2];
if (!version) {
  console.error("Aufruf: node scripts/release-notes.mjs <version>");
  process.exit(2);
}
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const section = changelogSection(changelog, version);
if (!section || !section.body) {
  console.error(`Im CHANGELOG.md fehlt der Abschnitt „## [${version.replace(/^v/, "")}]“ (oder er ist leer).`);
  process.exit(1);
}
process.stdout.write(`${section.body}\n`);
