# Anleitung

So wird ein Wettkampf mit GVM Trampolin ausgewertet, von den Meldungen bis zur Siegerliste.

## Installation

1. Auf der [Release-Seite](https://github.com/Lukas-sys/GAU-Meisterschaften-Trampolin/releases/latest) die Datei `GVM Trampolin_…_x64-setup.exe` herunterladen und starten.
2. Solange der Installer nicht mit einem Code-Signing-Zertifikat signiert ist, warnt Windows („Der Computer wurde durch Windows geschützt“). Dann auf **Weitere Informationen** und **Trotzdem ausführen** klicken.
3. Installiert wird nur für den angemeldeten Benutzer, Administratorrechte sind nicht nötig.

### Updates

Beim Start fragt das Programm bei GitHub nach, ob es eine neue Version gibt. Wenn ja, erscheint unten rechts ein Hinweis:

- **Was ist neu?** zeigt die Änderungen.
- **Jetzt aktualisieren** speichert den offenen Wettkampf, lädt das Update, installiert es und startet das Programm neu.
- **×** blendet den Hinweis bis zum nächsten Start aus. Es wird nie von selbst aktualisiert, auch nicht während eines Wettkampfs.

Ohne Internet startet das Programm ganz normal, es gibt dann nur keinen Hinweis. Die Änderungen der installierten Version stehen jederzeit unter **Was ist neu?** unten im Fenster.

## 1. Wettkampf anlegen

Auf der Startseite Name, Datum und Ort eintragen und **Anlegen und speichern …** klicken. Danach fragt das Programm, wo die Wettkampfdatei (`.gvm`) liegen soll. Alles steht in dieser einen Datei. Jede Änderung wird sofort gespeichert, die vorige Fassung bleibt als `.bak` daneben liegen.

Über **Datei öffnen …** oder die Liste **Zuletzt geöffnet** geht es später weiter.

## 2. Übersicht

- **Wettkampf**: Name, Datum, Ort.
- **Kampfgericht**: Anzahl der Haltungs-Kampfrichter:innen (bei 3 wird der Mittelwert der drei Noten als vierte Note ergänzt), HD-Kampfrichter:innen (0, 1 oder 2) und ob die Flugzeit (ToF) gewertet wird. Darunter die gemeldeten Kampfrichter:innen.
- **Klassen**: Einstellungen je Klasse, z. B. wie viele Wertungen je Durchgang zählen.
- **Pflichtabzug**: Die Abzugstabelle aus der Ausschreibung (Mindest-Pflichtstufe je Alter, Abzug je Stufe, Höchstabzug). Ändert sich die Ausschreibung, wird sie hier angepasst. Die Vorschau zeigt die Tabelle nach Jahrgang wie in der Ausschreibung.

Jeder Abschnitt lässt sich einklappen.

## 3. Meldungen

**Meldebögen importieren** liest die ausgefüllten Meldebögen der Vereine (`.xls`, `.xlsx`). Vor der Übernahme zeigt eine Vorschau alle Mannschaften mit Warnungen; Verein und Klasse lassen sich dort noch korrigieren.

Mit **Neue Mannschaft anlegen** werden Mannschaften von Hand erfasst. Turner:innen haben Name, Jahrgang, Pflichtstufe und je Durchgang einen Startplatz.

Der Pflichtabzug wird aus Jahrgang und Pflichtstufe berechnet. Nur in Ausnahmefällen über ✎ überschreiben; ↺ stellt den berechneten Wert wieder her.

Fehler in den Meldungen (doppelte Startplätze, fehlende Angaben, zu alte Turner:innen in der NK, …) stehen direkt bei der Mannschaft, die Zahl der Fehler am Reiter **Meldungen**.

## 4. Startlisten

- **Auslosen** legt die Mannschaftsreihenfolge je Klasse fest (gilt für Pflicht und Kür). Mit ▲▼ lässt sie sich von Hand ändern. **Neu auslosen** fragt vorher nach.
- Nachmeldungen nach dem Losen werden erkannt und lassen sich **hinten anfügen**.
- Die Startliste läuft reihum: erst Startplatz 1 aller Mannschaften, dann Startplatz 2 usw.
- **Drucken** druckt die angezeigte Liste, **Alle Startlisten drucken** alle Klassen und Durchgänge, jede auf einer eigenen Seite. In der Druckvorschau kann auch „Als PDF speichern“ gewählt werden.
- Die Startliste fürs Finale erscheint erst, wenn die Finalisten bestätigt sind (siehe 6.).

## 5. Wettkampf

Klasse und Durchgang wählen. Für jede Übung gibt es eine Folie mit Startnummer, Name, Mannschaft, Pflichtstufe und Pflichtabzug.

- Eingabe: E1–E4 (Haltung), HD1/HD2, D (Schwierigkeit, nicht in der Pflicht), ToF (falls aktiv), **Sonst.** (sonstiger Abzug, positiv eintragen) und **ab** (Anzahl gewerteter Sprünge, nur zur Information).
- Die Punkte werden sofort berechnet und gespeichert. Auffällige Eingaben (Noten außerhalb 0–10, große Abweichung der Haltungsnoten …) werden markiert.
- **Nicht angetreten** markiert die Übung, sie zählt dann nicht.
- Links die Startreihenfolge zum Springen (Punkt = Status: offen, unvollständig, gewertet, nicht angetreten), rechts der Zwischenstand der Mannschaften.

Tastatur: **Tab** nächstes Feld, **Enter** nächste Übung, **Umschalt+Enter** vorherige, **Bild auf/ab** blättern.

### Beamer

**Beamer öffnen** (oben rechts im Wettkampf) öffnet ein zweites Fenster für Beamer oder Hallen-Bildschirm:

1. Beamer oder Bildschirm anschließen und in Windows auf „Erweitern“ stellen (Windows-Taste + P).
2. **Beamer öffnen** klicken und das neue Fenster auf den Beamer ziehen.
3. Im Beamer-Fenster **F11** drücken oder doppelklicken, dann füllt es den ganzen Beamer. Noch einmal F11 oder Doppelklick verlässt das Vollbild.

Der Beamer folgt immer der Übung, die im Wettkampf gerade offen ist: Startnummer, Name, Mannschaft, Punkte mit Haltung, HD und Schwierigkeit, sobald die Wertung vollständig ist, dazu die letzte Wertung, wer als Nächstes springt, und der Zwischenstand (die Mannschaft der aktuellen Übung ist hervorgehoben).

Über die Auswahl neben dem Knopf zeigt der Beamer stattdessen **Nur Zwischenstand** (groß, z. B. vor dem Finale) oder **Pause** (nur der Wettkampfname). Wechselst du im Programm auf eine andere Seite, bleibt der Beamer beim letzten Stand. Schließt du das Hauptfenster, schließt sich auch der Beamer.

## 6. Ergebnisse und Finale

1. Nach Pflicht und Kür schlägt das Programm die Finalmannschaften vor (2/3 der Mannschaften, abgerundet, höchstens 5). Die Linie zeigt die Finalgrenze.
2. Bei Gleichstand an der Grenze entscheidet die Wettkampfleitung; die Reihenfolge wird mit den Pfeilen festgelegt.
3. **Finalisten bestätigen**. Danach gibt es die Finalliste in Startlisten und Wettkampf: schwächste Finalmannschaft zuerst.
4. Ändert sich der Vorkampf nach dem Bestätigen noch (Korrektur einer Note), erscheint ein Hinweis mit **Aktuellen Stand übernehmen**.

Endergebnis: Die Finalmannschaften nach Pflicht + Kür + Finale, danach die übrigen nach dem Vorkampf.

- **Ergebnisliste drucken**: alle Mannschaften mit allen Einzelwertungen, die gewerteten fett.
- **Siegerliste drucken**: Platzierungen für die Siegerehrung.
- **Als Excel exportieren**: eine Excel-Datei mit dem Ergebnis je Klasse, allen Einzelwertungen, allen Übungen mit Noten und den Wettkampfangaben.

## Tipps für den Wettkampftag

- Die Wettkampfdatei auf der lokalen Festplatte speichern, nicht auf einem Netzlaufwerk oder USB-Stick. Zwischendurch eine Kopie auf einen Stick ziehen schadet nicht.
- Drucker vorher einmal mit einer Startliste testen.
- Updates vorher installieren, nicht am Wettkampftag.
- Geht etwas schief: Programm schließen, die `.gvm`-Datei sichern und die `.bak` daneben als Notfallkopie behalten.
