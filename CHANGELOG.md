# Changelog

Alle wichtigen Änderungen an diesem Projekt. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt
- Eine Wettkampfdatei lässt sich nur noch in einem Fenster gleichzeitig öffnen. Versucht man es ein zweites Mal (auch von einem anderen Rechner über ein Netzlaufwerk), erscheint „Diese Datei ist bereits in einem anderen Fenster geöffnet“ mit Rechnername und Uhrzeit. Verschiedene Dateien in zwei Fenstern gehen weiterhin.
- Vor jedem Speichern prüft das Programm, ob die Datei inzwischen woanders geändert wurde. Dann wird nicht überschrieben, sondern ein roter Hinweis erscheint: **Meinen Stand als neue Datei speichern …** oder **Datei neu laden**. So kann ein zweites Fenster mit veraltetem Stand keine Eingaben mehr löschen.
- Wird in der Kür eingetragen, obwohl in der Pflicht derselben Klasse noch Übungen offen sind, fragt das Programm nach und nennt die offenen Startnummern: **Zur Pflicht** oder **Trotzdem eintragen**.
- „Ohne Komma tippen“ im Wettkampf: Bei Haltung, HD und D wird aus 67 dann 6,7 und aus 100 dann 10. Mit Komma getippt gilt der Wert wie eingegeben. Die Einstellung wird gemerkt.
- **Kontrollblatt drucken** bei den Startlisten: eine leere Tabelle je Durchgang in Startreihenfolge, im Querformat, mit Kästchen für alle Noten zum Mitschreiben von Hand. Als Sicherung, falls der Rechner ausfällt.

### Geändert
- Die Klasse wird jetzt einmal oben in der Reiterleiste gewählt und gilt für Meldungen, Startlisten, Wettkampf und Ergebnisse. Jede Klasse hat eine eigene Farbe, damit man nicht versehentlich in der falschen Klasse einträgt.
- Der Dialog nach dem letzten Springer bietet nur noch den naheliegenden nächsten Schritt an: nach der Pflicht die Kür, nach der Kür das Finale oder das Bestätigen der Finalisten, nach dem Finale die Ergebnisse. Dazu die Pflicht der anderen Klasse, solange sie nicht fertig ist.

## [1.3.0] – 2026-11-19

### Hinzugefügt
- Meldungen lassen sich wieder drucken: alle Mannschaften, die der gewählten Klasse oder eine einzelne, wahlweise eine oder zwei Mannschaften pro Seite oder alle hintereinander. Jahrgang, Pflichtstufe und Abzug, Startplätze und eine Unterschriftszeile sind einzeln abwählbar.
- Vor jedem Druck (Meldungen, Startlisten, Ergebnisliste) öffnet sich ein Dialog, in dem du einstellst, was auf das Blatt kommt. Die letzte Auswahl wird gemerkt.
- Die Ergebnisliste kann alle Einzelnoten enthalten: E1 bis E4 (gestrichene in Klammern), HD1 und HD2, D, Abzüge, „ab“ und Punkte je Durchgang.
- Fehlt bei vier Kampfrichter:innen genau eine Haltungsnote, fragt das Programm beim Weiterschalten, ob sie ergänzt werden soll. Eingesetzt wird der mittlere Wert der übrigen drei. Die ergänzte Note ist markiert.
- Beim letzten Springer eines Durchgangs heißt der Knopf „Fertig“. Danach zeigt ein Dialog, ob noch Übungen offen sind, und bietet an, mit dem nächsten Durchgang weiterzumachen oder zu den Ergebnissen zu wechseln.
- Sobald Wertungen eingetragen sind, fragt das Programm vor Änderungen an Übersicht, Meldungen und Startlisten nach, ob sie wirklich ausgeführt werden sollen (einmal je Seitenbesuch).

### Geändert
- Die Finalauswahl ist frei änderbar: Der Vorschlag nach der 2/3-Regel ist vorausgewählt, Mannschaften lassen sich aber über die Finalgrenze ziehen oder mit „Ins Finale“ und „Raus“ verschieben, bis hin zu allen Mannschaften. Bestätigte Finalisten lassen sich über „Auswahl ändern“ nachträglich bearbeiten.
- „ab“ gilt als 10, wenn nichts eingetragen ist, auch in der Ergebnisliste und im Excel-Export.

## [1.2.0] – 2026-11-19

### Geändert
- Beamer: Unten über die ganze Breite steht jetzt die letzte Wertung mit allen Einzelnoten (E1 bis E4 mit gestrichener höchster und niedrigster Note, HD1 und HD2, Schwierigkeit, ggf. ToF und Abzug). Sie bleibt stehen, bis die nächste Übung vollständig gewertet ist.

## [1.1.2] – 2026-11-19

### Behoben
- Im Wettkampf bleiben Klasse, Durchgang und die aktuelle Übung erhalten, wenn man kurz auf eine andere Seite wechselt (z. B. um eine Meldung nachzuschauen). Erst beim Schließen des Wettkampfs geht es wieder von vorne los.

## [1.1.1] – 2026-11-19

### Hinzugefügt
- Beamer-Ansicht: Im Wettkampf öffnet „Beamer öffnen“ ein zweites Fenster für Beamer oder Hallen-Bildschirm. Es zeigt die aktuelle Übung mit Wertung, die letzte Wertung, wer als Nächstes springt, und den Zwischenstand der Klasse. Umschaltbar auf „Nur Zwischenstand“ oder „Pause“; F11 oder Doppelklick schaltet auf Vollbild.

### Geändert
- Ergebnisse werden als echte Excel-Datei (.xlsx) exportiert statt als CSV: ein Blatt je Klasse mit dem Ergebnis, ein Blatt mit allen Einzelwertungen (gewertete fett), ein Blatt mit allen Übungen und Noten und ein Blatt mit den Wettkampfangaben. Druckfertig quer auf Seitenbreite.

## [1.0.1] – 2026-11-19

### Geändert
- Interne Aktualisierungen der Build-Werkzeuge (TypeScript 7, GitHub Actions). Am Programm selbst ändert sich nichts. Diese Version prüft vor allem, ob die automatische Aktualisierung funktioniert.

## [1.0.0] – 2026-11-19

### Hinzugefügt
- Projektgerüst als Desktop-Programm (Tauri 2, React, TypeScript) mit Windows-Installer-Build über GitHub Actions.
- Rechenkern:
  - Wertung einer Übung (Haltung mit Streichwertung, HD mit 0/1/2 Kampfrichter:innen, Schwierigkeit, optional ToF, Abzüge).
  - Pflichtabzug automatisch aus Jahrgang und Pflichtstufe (Tabelle 2026).
  - Mannschaftswertung (beste 4 je Durchgang), Rangliste mit Gleichstand-Erkennung und manueller Entscheidung.
  - Startreihenfolge reihum nach Startplatz, Auslosung, Finalreihenfolge (schwächste Mannschaft zuerst).
  - Finalqualifikation (2/3 der Mannschaften, höchstens 5).
- Tests, die die Werte der bisherigen Auswertungs-Excel nachrechnen.
- Wettkampf anlegen und öffnen; alles wird in einer `.gvm`-Datei gespeichert, jede Änderung automatisch (mit Sicherungskopie `.bak`).
- Übersicht: Name, Datum, Ort, Kampfgericht (Anzahl Haltungs-/HD-Kampfrichter:innen, ToF), gemeldete Kampfrichter:innen, Klasseneinstellungen.
- Meldungen: Mannschaften und Turner:innen je Klasse anlegen und bearbeiten.
- Pflichtabzug wird überall (auch bei von Hand angelegten Mannschaften) sofort als berechneter Wert angezeigt; Überschreiben nur bewusst über ✎, Zurücksetzen über ↺.
- Abzugstabelle in der Übersicht anpassbar (Mindest-Pflichtstufe nach Alter, Abzug je Stufe, Höchstabzug) mit Vorschau nach Jahrgang wie in der Ausschreibung.
- Import ausgefüllter Meldebögen (.xls/.xlsx) mit Vorschau, Warnungen und Korrektur von Verein und Klasse vor der Übernahme.
- Meldungen nach Verein gruppiert und einklappbar, neue Mannschaften werden in einem Dialog erfasst und erscheinen oben.
- Import der Meldebögen direkt aus den Meldungen heraus (Dialog statt eigener Seite).
- Übersicht in einklappbare Abschnitte gegliedert; eingeklappt zeigt jeder Abschnitt eine Kurzfassung, der Zustand wird gemerkt.
- Vereine in den Meldungen bilden mit ihren Mannschaften einen gemeinsamen Rahmen statt loser Karten mit Abstand.
- Pflichtstufen P3, M0 bis M10; ab M6 gibt es keinen Pflichtabzug. „M6+“ im Meldebogen wird als M6 mit Hinweis übernommen.
- Startlisten (M3):
  - Mannschaftsreihenfolge je Klasse auslosen (Zeitpunkt wird gespeichert, neu losen nur mit Bestätigung), von Hand verschieben oder ohne Losen übernehmen.
  - Nachmeldungen werden erkannt und lassen sich hinten anfügen.
  - Startliste Pflicht und Kür wie in der Excel (Nr, Name, Jahrgang, Pflichtstufe, Abzug, Verein, Startplatz), Blöcke je Startplatz.
  - Drucken bzw. als PDF speichern: einzelne Liste oder alle Listen, jede auf eigener A4-Seite.
  - Solange die Druckvorschau offen ist, beendet ein Klick auf das X des Programmfensters das Programm nicht.
- Knopf oben rechts heißt jetzt „Wettkampf schließen“, damit er nicht mit dem Schließen eines Dialogs verwechselt wird.
- Wettkampfmodus (M4):
  - Klasse und Durchgang wählen, je Übung eine Folie mit Startnummer, Name, Mannschaft, Pflichtstufe und Pflichtabzug.
  - Eingabe E1–E4 (je nach Kampfgericht), HD1/HD2, D, ToF (falls aktiv), Sonst. und „ab“; Punkte werden sofort berechnet, jede Eingabe sofort gespeichert.
  - Status je Übung: offen, unvollständig, gewertet, nicht angetreten; Plausibilitätsprüfung (Noten außerhalb 0–10, große Abweichung der Haltungsnoten u. a.).
  - Bedienung per Tastatur: Tab, Enter = nächste Übung, Umschalt+Enter = vorherige, Bild auf/ab; Startreihenfolge zum Springen, „Als Nächstes“.
  - Live-Tabelle der Mannschaften (Pflicht, Kür, Vorkampf) mit den Einzelwertungen des Durchgangs, gewertete fett.
- Finale und Ergebnisse (M5):
  - Neue Seite „Ergebnisse“: Vorschlag der Finalmannschaften (2/3, höchstens 5) mit Finalgrenze; Gleichstand an der Grenze wird von Hand entschieden, danach bestätigen.
  - Hinweis, wenn sich der Vorkampf nach dem Bestätigen noch ändert, mit Übernahme des aktuellen Stands.
  - Finale in Startlisten und Wettkampfmodus, sobald die Finalisten bestätigt sind: schwächste Finalmannschaft zuerst, Turner:innen reihum.
  - Endergebnis: Finalmannschaften nach Pflicht + Kür + Finale, danach die übrigen nach dem Vorkampf; Gleichstand per ▲▼ entscheidbar.
  - Ergebnisliste mit allen Einzelwertungen (gewertete fett) und Siegerliste drucken; Export aller Ergebnisse als CSV für Excel.
  - Live-Tabelle zeigt im Finale Finale und Gesamt.
- Updates und Veröffentlichung (M6):
  - Beim Start prüft das Programm, ob es eine neue Version gibt, und zeigt dann unten rechts einen Hinweis mit „Was ist neu?“ und „Jetzt aktualisieren“ (speichert, lädt mit Fortschrittsanzeige, installiert und startet neu). Ohne Internet passiert einfach nichts.
  - Updates sind signiert; das Programm installiert nur Updates, die zum eingebauten Schlüssel passen.
  - Nach einem Update einmal der Hinweis „Aktualisiert auf Version …“; „Was ist neu?“ unten im Fenster zeigt jederzeit das Changelog.
  - Release-Text kommt automatisch aus diesem Changelog; `npm run release:prepare` setzt die Version überall.
  - Anleitung für Anwender:innen (`docs/ANLEITUNG.md`) und Maintainer (`docs/RELEASE.md`).
- Bei 3 Haltungskampfrichter:innen wird der Mittelwert der drei Noten als vierte Note ergänzt (Vorgabe des Kampfgerichts).
- Prüfung der Meldungen: doppelte Startplätze, zu viele Starter:innen, fehlende Angaben, zu alte Turner:innen in der NK, doppelte Meldungen.
