# GVM Trampolin

Desktop-Programm für die Auswertung der Gau-Vereinsmeisterschaften im Trampolinturnen: Meldungen einlesen, Startreihenfolge auslosen, Wertungen im Wettkampf erfassen und Ergebnisse berechnen. Es ersetzt die bisherige Auswertungs-Excel.

## Installation

Den Installer `GVM Trampolin_…_x64-setup.exe` von der [Release-Seite](https://github.com/Lukas-sys/GAU-Meisterschaften-Trampolin/releases/latest) herunterladen und starten (Windows 10/11). Danach hält sich das Programm selbst aktuell: Gibt es eine neue Version, erscheint beim Start ein Hinweis mit „Jetzt aktualisieren“.

Wie man damit einen Wettkampf auswertet, steht in der [Anleitung](docs/ANLEITUNG.md). Was sich geändert hat, steht im [Changelog](CHANGELOG.md), der Plan und die Regeln in [docs/PLAN.md](docs/PLAN.md).

## Entwicklung

Voraussetzungen: [Node.js 22](https://nodejs.org/), [Rust](https://rustup.rs/) und die [Tauri-Voraussetzungen für Windows](https://tauri.app/start/prerequisites/) (WebView2 ist bei Windows 10/11 meist schon installiert).

```bash
npm ci              # Abhängigkeiten genau nach package-lock.json installieren
npm test            # Rechenkern testen
cargo test --manifest-path src-tauri/Cargo.toml  # Datei- und Excel-Zugriff testen
npm run tauri dev   # Programm im Entwicklungsmodus starten
npm run tauri build # Installer bauen (src-tauri/target/release/bundle/nsis)
```

Bitte `npm ci` statt `npm install` verwenden: `npm install` unter Windows entfernt Einträge für andere Systeme aus `package-lock.json`, danach scheitert die CI. Neue Pakete mit `npm install <paket>` hinzufügen und vor dem Commit prüfen, ob die Lockdatei Einträge verloren hat.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/core/` | Wettkampfregeln ohne Oberfläche: Wertung, Pflichtabzug, Mannschaftswertung, Startreihenfolge, Finale |
| `src/ui/`, `src/App.tsx` | Oberfläche (React) |
| `src/platform.ts` | Dateien und Dialoge (Tauri); im Browser nur eingeschränkt |
| `src/updater.ts` | Updates über GitHub Releases (tauri-plugin-updater) |
| `src-tauri/` | Desktop-Hülle (Tauri/Rust): Speichern mit Sicherungskopie, Excel lesen (calamine) und schreiben (rust_xlsxwriter) |
| `scripts/` | Release vorbereiten, Release-Text aus dem Changelog |
| `tests/` | Tests; `tests/fixtures/` enthält anonymisierte Beispieldaten aus der bisherigen Excel |

## Release

Kurz: `CHANGELOG.md` pflegen, `npm run release:prepare -- 1.2.0`, committen, Tag `v1.2.0` pushen, den Release-Entwurf auf GitHub prüfen und veröffentlichen. Alles Weitere (Signaturschlüssel, Secrets, Schutz von `main` und den Tags) steht in [docs/RELEASE.md](docs/RELEASE.md).

## Datenschutz

Echte Meldungen und Ergebnisse gehören nicht ins Repository. Wettkampfdateien (`*.gvm`) und Excel-Dateien sind in `.gitignore` ausgeschlossen.

## Lizenz

[MIT](LICENSE). Sicherheitslücken bitte privat melden, siehe [SECURITY.md](SECURITY.md).
