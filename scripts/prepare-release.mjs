// Bereitet ein Release vor:
//   npm run release:prepare -- 1.2.0
// - setzt die Version in package.json, package-lock.json, src-tauri/tauri.conf.json,
//   src-tauri/Cargo.toml und src-tauri/Cargo.lock
// - macht aus „## [Unveröffentlicht]“ im CHANGELOG.md „## [1.2.0] – <heute>“ und legt
//   darüber einen neuen, leeren Abschnitt „Unveröffentlicht“ an
// Danach: Änderungen prüfen, committen, Tag v1.2.0 anlegen und pushen (siehe docs/RELEASE.md).
import { readFileSync, writeFileSync } from "node:fs";

const version = (process.argv[2] ?? "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Aufruf: npm run release:prepare -- <version>, z. B. 1.2.0");
  process.exit(2);
}

const root = new URL("../", import.meta.url);
const edit = (path, change) => {
  const url = new URL(path, root);
  const before = readFileSync(url, "utf8");
  const after = change(before);
  if (after === before) throw new Error(`${path}: nichts geändert`);
  writeFileSync(url, after);
  console.log(`✓ ${path}`);
};
const json = (path, change) =>
  edit(path, (text) => {
    const data = JSON.parse(text);
    change(data);
    return `${JSON.stringify(data, null, 2)}\n`;
  });

json("package.json", (p) => (p.version = version));
json("package-lock.json", (p) => {
  p.version = version;
  p.packages[""].version = version;
});
json("src-tauri/tauri.conf.json", (c) => (c.version = version));
edit("src-tauri/Cargo.toml", (t) => t.replace(/^(\[package\][^[]*?\nversion = ")[^"]*"/m, `$1${version}"`));
edit("src-tauri/Cargo.lock", (t) =>
  t.replace(/(\[\[package\]\]\nname = "gvm-trampolin"\nversion = ")[^"]*"/, `$1${version}"`),
);
edit("CHANGELOG.md", (t) => {
  if (!t.includes("## [Unveröffentlicht]")) throw new Error("CHANGELOG.md: „## [Unveröffentlicht]“ fehlt");
  const today = new Date().toISOString().slice(0, 10);
  return t.replace("## [Unveröffentlicht]", `## [Unveröffentlicht]\n\n## [${version}] – ${today}`);
});
console.log(`\nVersion ${version} vorbereitet. Jetzt prüfen, committen und den Tag v${version} pushen.`);
