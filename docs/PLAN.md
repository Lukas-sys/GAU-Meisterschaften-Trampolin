# Plan: Programm für die Gau-Vereinsmeisterschaften Trampolin

Stand: 19.11.2026 · Status: M0 bis M6 umgesetzt (v1.0-Funktionsumfang, Updater, Release-Ablauf). Offen für M6: Signaturschlüssel erzeugen, Repo öffentlich machen, erstes Release (siehe docs/RELEASE.md)

Grundlage: `Meldebogen_GVM2026.xls`, `Auswertung GVM.xlsx` (anonymisiert) und die Ausschreibung `AusGVM2026.pdf`.

---

## 1. Wie der Wettkampf funktioniert (aus den Dateien rekonstruiert)

### 1.1 Klassen und Mannschaften

| | Offene Klasse (OK) | Nachwuchsklasse (NK) |
|---|---|---|
| Wer | jahrgangsoffen, gemischt | bis einschließlich AK10 |
| Mannschaften pro Verein | beliebig viele | beliebig viele |
| Turner:innen pro Mannschaft | bis 8 | bis 8 |
| Starter pro Durchgang | max. 6 | max. 6 |
| Wertung pro Durchgang | beste 4 | beste 4 |
| Durchgänge | Pflicht, Kür, Finale (2. Kür) | Pflicht, Kür (kein Finale) |
| Finale | 2/3 der Mannschaften (Ausschreibung: max. 5) | entfällt |

Beide Klassen sind getrennte Wettkämpfe am selben Tag (erst NK, danach OK). Die große Excel wird pro Klasse einmal benutzt.

### 1.2 Pflicht und Kür

- **Pflicht**: eine vorgeschriebene Übung. Es gibt Stufen von leicht nach schwer: `P3, M0 bis M10` (in der Ausschreibung „M6+“: ab M6 kein Abzug). Jede Person meldet, welche Pflichtstufe sie springt (Spalte „Pflicht“ im Meldebogen).
- **Pflichtabzug**: Wer eine *leichtere* Pflicht springt, als für den Jahrgang vorgesehen ist, bekommt einen festen Abzug (0,9 Punkte pro Stufe, max. 3,6). Schwerere Übungen bringen keinen Bonus. Die Tabelle steht in der Ausschreibung (Jahrgang → Altersklasse → Abzug je Stufe). In der Excel wird der Abzug **von Hand** eingetragen; das Programm kann ihn automatisch aus Jahrgang und Pflichtstufe berechnen.
- **Kür**: eine frei zusammengestellte Übung. Hier zählt zusätzlich die **Schwierigkeit (D)** als Pluspunkte.
- **Finale** = „2. Kür“ im Meldebogen.

### 1.3 Meldebogen (pro Verein)

Je Mannschaft (bis 4 pro Bogen): Klasse (OK/NK), dann bis zu 8 Zeilen mit
`Name | Vorname | Jahrgang | Pflichtstufe | Startplatz Pflicht | Startplatz 1. Kür | Startplatz 2. Kür`.
Startplatz 1–6 heißt „springt an Position X“, leer/0 heißt „springt in diesem Durchgang nicht“. Dazu kommen die gemeldeten Kampfrichter:innen.

### 1.4 Startreihenfolge

1. Die **Reihenfolge der Mannschaften wird gelost** (in der Excel per Zufallszahl im Blatt „Meldung“, Spalte „RF“). Sie gilt **unverändert für Pflicht und Kür**.
2. Innerhalb eines Durchgangs geht es **reihum**: Startplatz 1 von Mannschaft 1, Startplatz 1 von Mannschaft 2, … dann Startplatz 2 von Mannschaft 1 usw.
   (Excel-Sortierschlüssel: `Durchgang × 100 + Startplatz × 10 + Mannschaftsnummer`.)
3. Wer im Durchgang keinen Startplatz hat, springt nicht.
4. **Finale**: Die Mannschaftsreihenfolge richtet sich nach dem Vorkampf, die schwächste Finalmannschaft zuerst, die beste zuletzt. Die Einzelspringer:innen wechseln sich wie gewohnt reihum nach Startplatz ab.

### 1.5 Wertung einer Übung

Eingegeben werden pro Übung:

| Feld | Bedeutung |
|---|---|
| E1–E4 | Haltungsnoten der vier Haltungs-Kampfrichter:innen |
| HD1, HD2 | Horizontale Verschiebung (zwei Kampfrichter:innen, optional) |
| D | Schwierigkeit (v. a. Kür) |
| Sonst. Abzug | sonstige Abzüge |
| ab | Anzahl gewerteter Sprünge bei Abbruch (10 = vollständig). **Nur Information**, ist in den Noten bereits berücksichtigt |
| ToF | Flugzeit, **optional** (pro Wettkampf zuschaltbar) |
| Pflichtabzug | automatisch aus Meldung |

Formel aus der Excel:

```
Haltung  = Summe(E1..E4) − höchste − niedrigste      (die mittleren zwei zählen)
HD       = keine HD-Wertung → 0 | ein HD-Richter → HD1 | zwei → (HD1 + HD2) / 2
Punkte   = Haltung + HD + D (+ ToF, falls aktiv) − Pflichtabzug − Sonst. Abzug
```

Die Anzahl der HD-Kampfrichter:innen (0, 1 oder 2) wird pro Wettkampf eingestellt. Bei 3 Haltungsrichter:innen wird der Mittelwert der drei als vierte Note ergänzt, dann gilt die Regel für 4 (Vorgabe des Kampfgerichts, 18.11.2026). Für 5 ist die Regel noch offen.

Beispiel aus der Datei: E = 6,8 / 6,5 / 7,0 / 7,3 → 6,8 + 7,0 = 13,8; HD = 9,9; D = 0 → **23,70**.

### 1.6 Mannschaftswertung und Finale

- Pro Durchgang zählen die **4 besten** Einzelwertungen der Mannschaft. Bei gleicher Punktzahl an der Grenze ist egal, wer zählt (die Summe bleibt gleich); das Programm markiert dann alphabetisch.
- **Vorkampf** = Pflicht-Summe + Kür-Summe → Rangliste.
- **2/3 der Mannschaften** der OK kommen ins Finale.
- **Gesamt** = Pflicht + Kür + Finale → Endrangliste (bestätigt: alles zählt).
- **Gleichstand zwischen Mannschaften**: Das Programm erkennt ihn und lässt den/die Bediener:in entscheiden (Reihenfolge festlegen oder gleicher Rang).

### 1.7 Warum die Excel so schwer zu verstehen ist

Die Mappe hat 12 Blätter. Der Ablauf laut Blatt „Manual“: Meldung ausfüllen → Daten kopieren und als Werte einfügen → nach Reihenfolge sortieren → Startliste drucken → Wertungen in „Pflicht“ und „Kür“ eintragen → in die Ergebnisliste kopieren → nach Index sortieren → drucken → für das Finale das Ganze noch einmal. Jeder Kopier-/Sortierschritt kann Daten verschieben. In der Beispieldatei sieht man das schon:

- Im Blatt „Daten“ ist die Finalzeile von A1 mit der Pflichtwertung von A2 (14,9) befüllt, weil die eingefügten Zeilen um eine Zeile verrutscht sind.
- Der Pflichtabzug von A8 zeigt auf die falsche Zelle (Startplatz statt Abzug), bei Verein D zeigt der Pflicht-Startplatz auf die Kür-Spalte.
- Das Blatt „Finale“ verweist auf eine externe Datei und zeigt nur `#REF!`.
- Die Auslosung ist zwar vorhanden, wird aber nicht automatisch in die Startreihenfolge übernommen.

Das Programm ersetzt all diese Schritte durch ein Datenmodell, in dem nichts kopiert oder sortiert werden muss.

---

## 2. Ziel des Programms

Ein Programm, das man auf einem normalen Windows-Laptop installiert und das **komplett offline** läuft (Turnhalle ohne WLAN), und das:

1. Meldebögen einliest und manuelle Korrekturen erlaubt,
2. die Mannschaftsreihenfolge auslost und Startlisten erzeugt,
3. im Wettkampf eine geführte Eingabe („Slideshow“) mit Live-Tabelle bietet,
4. Finale und Endergebnis automatisch berechnet,
5. Start- und Ergebnislisten druckt bzw. als PDF/Excel exportiert,
6. sich später selbst aktualisiert (Hinweis im Programm, Ein-Klick-Update, Changelog). Der Updater kommt erst in einer späteren Phase.

Zielplattform: **Windows**. Ein Eingabeplatz (ein Laptop); mehrere Geräte sind eine mögliche spätere Erweiterung.

---

## 3. Architektur-Vorschlag

### 3.1 Technik

| Baustein | Vorschlag | Warum |
|---|---|---|
| Desktop-Hülle | **Tauri 2** | kleiner Installer (~10 MB statt ~100 MB bei Electron), eingebauter Updater mit Signatur, läuft auf Windows/macOS/Linux |
| Oberfläche | **React + TypeScript** (Vite), UI-Bibliothek z. B. Mantine | moderne, gut wartbare Web-Oberfläche, viele Mitwirkende kennen es |
| Wettkampflogik | reines TypeScript-Modul (`core/`) ohne UI-Abhängigkeit | Regeln sind isoliert testbar |
| Speicherung | eine Wettkampfdatei pro Veranstaltung (`.gvm`, intern SQLite oder JSON) + Autosave | einfach zu sichern, auf USB-Stick mitzunehmen, kein Server |
| Excel-Import/-Export | SheetJS (`xlsx`) | liest das alte `.xls` des Meldebogens und `.xlsx` |
| Druck/PDF | HTML-Druckansichten → PDF | Startlisten, Ergebnislisten, Urkunden-Daten |
| Tests | Vitest (Logik), Playwright (UI) | Rechenregeln werden gegen die Werte der Excel geprüft |

Alternative, falls gewünscht: Electron (größer, aber noch verbreiteter) oder Python/PySide (einfacher Einstieg, aber Auto-Update deutlich mühsamer). Meine Empfehlung bleibt Tauri.

### 3.2 Updates (Meilenstein M6, umgesetzt)

Umgesetzt mit `tauri-plugin-updater` und `tauri-plugin-process`. Ablauf und Einrichtung für Maintainer: `docs/RELEASE.md`.

```
GitHub (Tag v1.2.0)
   └─ GitHub Actions baut Installer für Windows (+ optional macOS)
       └─ signiert das Update-Paket und hängt es + latest.json an das GitHub-Release
            └─ Programm prüft beim Start latest.json
                 └─ Banner „Version 1.2.0 verfügbar“ + Changelog (aus den Release-Notes)
                      └─ Button „Jetzt aktualisieren“ → lädt, installiert, startet neu
```

- Changelog wird in `CHANGELOG.md` gepflegt und automatisch als Release-Text übernommen.
- Updates sind kryptografisch signiert (Tauri-Updater-Schlüssel), damit niemand ein fremdes Update unterschieben kann.
- Während eines laufenden Wettkampfs wird **nie** automatisch aktualisiert, nur angeboten.
- **Privates Repo**: Das Programm kann Updates aus einem privaten Repo nicht ohne Zugangsdaten laden. Updates funktionieren deshalb erst, wenn das Repo öffentlich ist.
- Update-Paket und Signatur entstehen nur im Release-Build (`src-tauri/tauri.release.conf.json`), damit `npm run tauri build` lokal ohne Schlüssel funktioniert.
- Windows zeigt bei unsigniertem Installer einmalig eine SmartScreen-Warnung. Ein Code-Signing-Zertifikat kostet Geld; für den Anfang reicht „Trotzdem ausführen“.

### 3.3 Datenmodell (vereinfacht)

```
Wettkampf (Name, Datum, Ort, Einstellungen)
 ├─ Pflichtabzugstabelle (Jahrgang → AK → Abzug je Pflichtstufe), pro Jahr editierbar
 ├─ Klasse (OK / NK; Starter je Durchgang = 6, Wertung = 4, Finalteams = 5 / 0)
 │   └─ Mannschaft (Verein, Nr., Losnummer)
 │        └─ Turner:in (Name, Vorname, Jahrgang, Pflichtstufe,
 │                      Startplatz Pflicht / Kür / Finale)
 ├─ Durchgang (Klasse, Art: Pflicht/Kür/Finale, Status)
 │   └─ Start (Turner:in, laufende Nr.) → Wertung (E1–E4, HD1–2, D, Sonst., ab)
 └─ Kampfrichter:innen (optional)
```

Ergebnisse, Ränge und Startlisten werden **immer berechnet**, nie kopiert.

---

## 4. Funktionen

### 4.1 Wettkampf anlegen
- Neuer Wettkampf aus Vorlage (Ausschreibungsdaten, Pflichtabzugstabelle des Vorjahres übernehmen).
- Einstellungen pro Klasse: Starter pro Durchgang, Anzahl in Wertung, Finalanteil (Standard 2/3), Anzahl E-Kampfrichter, HD-Kampfrichter (0/1/2), ToF an/aus.

### 4.2 Meldungen
- **Import** eines oder mehrerer Meldebögen (`.xls`/`.xlsx`) per Drag & Drop. Vorschau mit Warnungen (fehlender Jahrgang, doppelter Startplatz, mehr als 6 Starter, unbekannte Pflichtstufe, NK-Turner:in zu alt).
- **Manuelle Bearbeitung**: Mannschaften und Personen anlegen, ändern, verschieben, löschen; Nachmeldungen am Wettkampftag; Startplätze per Drag & Drop.
- Pflichtabzug wird automatisch berechnet und angezeigt, kann aber überschrieben werden.
- Checkliste Vereine (Meldegeld, Kampfrichter gemeldet).

### 4.3 Auslosung & Startlisten
- Knopf „Auslosen“ (nachvollziehbar, Ergebnis wird gespeichert; erneutes Losen nur mit Bestätigung), alternativ Reihenfolge von Hand festlegen.
- Startlisten je Klasse und Durchgang, druckbar und als PDF.

### 4.4 Wettkampfmodus („Slideshow“)
- „Wettkampf starten“ → Auswahl Klasse + Durchgang.
- Pro Folie: **Startnummer, Name, Verein, Mannschaft, Durchgang, Pflichtstufe** (bei Pflicht), Pflichtabzug, dazu Eingabefelder E1–E4, HD (je nach Einstellung 0–2 Felder), D, ToF (falls aktiv), Sonst. Abzug, „ab“ (Info).
- Sofortige Anzeige der berechneten Punkte; Plausibilitätsprüfung (z. B. E-Note > 10).
- Bedienung komplett per Tastatur möglich: Tab zwischen Feldern, Enter = speichern und weiter, Pfeiltasten / Buttons ◀ ▶ zum Blättern. Bereits eingetragene Wertungen lassen sich jederzeit korrigieren.
- Vorschau: „Als Nächstes: …“ (damit die nächste Person sich bereitmachen kann).
- Status: nicht gesprungen / gewertet / ausgefallen.
- **Live-Tabelle** daneben (bei breitem Bildschirm) oder einklappbar: Mannschaftsrangliste mit Pflicht, Kür, Vorkampf, Finale, Gesamt; die 4 gewerteten Ergebnisse je Mannschaft markiert.
- Bonus für später: **Hallen-/Beamer-Ansicht** in einem zweiten Fenster (aktuelle Person, letzte Wertung, Zwischenstand).

### 4.5 Finale
- Nach dem Vorkampf schlägt das Programm die Finalmannschaften vor (beste 2/3 im Vorkampf), mit Bestätigung durch den/die Bediener:in. Gleichstand an der Finalgrenze entscheidet der/die Bediener:in.
- Startliste Finale entsteht automatisch: Mannschaften in umgekehrter Vorkampf-Reihenfolge (schwächste zuerst), Einzelspringer:innen reihum nach Startplatz „2. Kür“.
- Endergebnis wird automatisch berechnet.

### 4.6 Ergebnisse & Export
- Ergebnisliste je Klasse (Mannschaften mit allen Einzelwertungen, Siegerliste).
- PDF-Druck, Excel-Export (für Archiv und Veröffentlichung), optional CSV.
- Sicherung: Autosave nach jeder Eingabe, Backup-Kopie in einem zweiten Ordner.

---

## 5. Meilensteine

| # | Meilenstein | Inhalt | Ergebnis |
|---|---|---|---|
| M0 | Grundgerüst | Tauri-Projekt, Ordnerstruktur, Lint/Tests, GitHub Actions baut einen Windows-Installer, `CHANGELOG.md` | leeres Programm v0.1 zum Installieren |
| M1 | Rechenkern | Datenmodell, Wertungsformel (inkl. HD 0/1/2, ToF optional), Pflichtabzug, Mannschaftswertung (beste 4), Ränge, Finalqualifikation (2/3) und Finalreihenfolge; Tests mit den Zahlen aus der Excel | geprüfte Logik ohne UI |
| M2 | Meldungen | Wettkampf anlegen, Import Meldebogen, manuelle Bearbeitung, Validierung, Speichern/Laden | Meldungen vollständig erfassbar |
| M3 | Auslosung & Startlisten | Losen, Startreihenfolge, Druck/PDF | Startlisten wie bisher, ohne Excel |
| M4 | Wettkampfmodus | Slideshow-Eingabe, Navigation, Live-Tabelle | Vorkampf komplett im Programm durchführbar |
| M5 | Finale & Ergebnisse | Finalqualifikation mit Gleichstand-Entscheidung, Finale-Durchgang, Ergebnislisten, Export | Gesamter Wettkampf abbildbar, **v1.0** |
| M6 | Updater & Veröffentlichung | In-App-Update mit Changelog über GitHub Releases, README/Anleitung, Repo öffentlich, Code-Signing (Vorschlag: SignPath Foundation, Alternative Certum Open Source) | Programm hält sich selbst aktuell |
| M7 | Bonus | Beamer-Ansicht, ggf. mehrere Eingabeplätze | nach Bedarf |

Zeitplanung: Der Wettkampf am **21.11.2026** ist in drei Tagen, dafür ist das Programm nicht realistisch. Ziel ist die **GVM 2027**. Die diesjährige Veranstaltung kann man nutzen, um den echten Ablauf zu beobachten und (mit Einverständnis) eine ausgefüllte Excel als Testdatensatz zu bekommen.

---

## 6. Entscheidungen (Antworten von Lukas, 18.11.2026)

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Reihenfolge Pflicht/Kür | Geloste Reihenfolge bleibt für beide gleich |
| 2 | Finale-Reihenfolge | Schwächste Finalmannschaft zuerst, beste zuletzt; Einzelspringer:innen weiter reihum |
| 3 | Endwertung / Finale | Pflicht + Kür + Finale zählen; 2/3 der Mannschaften kommen ins Finale |
| 4 | Gleichstand | Bei den 4 Streichwertungen egal (alphabetisch markieren); bei Mannschaften entscheidet der/die Bediener:in |
| 5 | Kampfgericht | HD: 0, 1 (Wert direkt) oder 2 (Mittelwert). Bei 3 Haltungsrichter:innen: Mittelwert der drei als vierte Note (Nachtrag 18.11.2026); 5: noch offen |
| 6 | Spalte „ab“ | Nur Information, bereits in den Noten berücksichtigt |
| 7 | ToF | Optional |
| 8 | Updater | Umgesetzt in M6: Hinweis beim Start, Installation nur auf Knopfdruck |
| 9 | Betriebssystem | Windows |
| 10 | Beamer-Ansicht | Bonus, erst mal nicht nötig |
| 11 | Eingabeplätze | Erst einer, später vielleicht mehrere |
| 12 | Datenschutz | Keine echten Namen im Repo |

### Noch offen (blockiert den Start nicht)

- **Rundung 2/3**: Wie wird bei nicht teilbaren Zahlen gerundet (z. B. 5 Mannschaften → 3 oder 4)? Gilt zusätzlich das Maximum von 5 aus der Ausschreibung? Vorschlag: abrunden, höchstens 5, einstellbar.
- **ToF**: Wird die Flugzeit einfach zur Punktzahl addiert? Vorschlag: ja, wenn aktiviert.
- **5 Haltungsrichter:innen**: Vorschlag: höchste und niedrigste streichen, Mittelwert der übrigen × 2. Noch mit dem Kampfgericht klären. Offen ist auch, ob die ergänzte vierte Note bei 3 Richter:innen gerundet wird (derzeit ungerundet).

---

## 7. Technische Schulden

| # | Thema | Stand jetzt | Später besser lösen |
|---|---|---|---|
| TD1 | Drucken (seit M3) | `window.print()` öffnet die Druckvorschau von WebView2. Sie füllt das ganze Programmfenster. Damit ein Klick auf das X des Fensters nicht das Programm beendet, wird das Schließen während der Vorschau und 1,5 s danach ignoriert (`src/printGuard.ts`). Verworfen: der Windows-Systemdialog über `ICoreWebView2_16::ShowPrintUI` (funktionierte nicht sauber) und ein eigenes, kleineres Druckfenster (der Hintergrund in Druckansicht schaut neben der Vorschau heraus). | z. B. PDF selbst erzeugen (WebView2 `PrintToPdf` oder eine PDF-Bibliothek) und im Standard-PDF-Programm öffnen bzw. direkt drucken; dann auch „Als PDF speichern“ ohne Druckdialog. Betrifft seit M5 auch Ergebnis- und Siegerliste. |
| TD2 | Excel-Export (seit M5) | Export als CSV (Semikolon, Dezimalkomma, UTF-8), öffnet sich in Excel. | Echte .xlsx-Datei mit Formatierung, z. B. über `rust_xlsxwriter` im Rust-Teil. |
