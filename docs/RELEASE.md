# Releases und Repository-Einstellungen

Für Maintainer: wie eine neue Version entsteht und wie das Repository geschützt ist.

## Überblick

```
CHANGELOG.md pflegen
  └─ npm run release:prepare -- 1.2.0     Version setzen, Changelog-Abschnitt anlegen
       └─ Commit + Tag v1.2.0 pushen
            └─ GitHub Actions (release.yml)
                 ├─ prüft: Tag = Version, Changelog-Abschnitt vorhanden, Tests grün
                 ├─ baut den Installer und signiert das Update-Paket
                 └─ legt einen Release-Entwurf an (Installer, .sig, latest.json, Text aus dem Changelog)
                      └─ Entwurf prüfen und veröffentlichen
                           └─ installierte Programme bieten das Update beim nächsten Start an
```

Das Programm fragt `https://github.com/Lukas-sys/GAU-Meisterschaften-Trampolin/releases/latest/download/latest.json` ab. Das klappt nur bei einem **öffentlichen** Repository und nur für **veröffentlichte** Releases (keine Entwürfe, keine Pre-Releases).

## Einmalig: Signaturschlüssel für Updates

Jedes Update ist mit einem privaten Schlüssel signiert. Das Programm installiert nur Updates, die zum eingebauten öffentlichen Schlüssel passen. So kann niemand ein fremdes Update unterschieben, selbst wenn jemand ein Release auf GitHub manipulieren würde.

1. Schlüssel erzeugen (PowerShell im Projektordner), dabei ein Passwort vergeben:
   ```powershell
   npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\gvm-trampolin.key"
   ```
   Es entstehen `gvm-trampolin.key` (privat) und `gvm-trampolin.key.pub` (öffentlich).
2. Den Inhalt von `gvm-trampolin.key.pub` in `src-tauri/tauri.conf.json` bei `plugins.updater.pubkey` eintragen (statt `HIER_DEN_OEFFENTLICHEN_SCHLUESSEL_EINTRAGEN`) und committen. Der öffentliche Schlüssel darf ins Repository.
3. Privaten Schlüssel und Passwort sicher aufbewahren, z. B. im Passwortmanager. **Geht der Schlüssel verloren, können die installierten Programme keine Updates mehr annehmen**; dann muss jede:r einmal von Hand eine neue Version installieren. Der private Schlüssel gehört nie ins Repository.

Solange der Platzhalter in `tauri.conf.json` steht, schlägt der Release-Build fehl. Das ist Absicht.

## Einmalig: GitHub einrichten

### Umgebung „release“ mit den Secrets

*Settings → Environments → New environment* → Name `release`.

- **Deployment branches and tags**: „Selected branches and tags“ → *Add deployment branch or tag rule* → Typ **Tag**, Muster `v*`. Damit kommt nur ein Release-Tag an den Schlüssel, kein Branch und kein Pull Request.
- **Environment secrets**:
  - `TAURI_SIGNING_PRIVATE_KEY`: kompletter Inhalt von `gvm-trampolin.key`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: das Passwort
- Optional **Required reviewers**: dich selbst eintragen. Dann wartet jeder Release-Build auf einen Klick von dir.

### Wer darf was

Bei einem öffentlichen Repository können alle lesen, forken und Pull Requests stellen. Pushen, mergen, Tags anlegen und Releases veröffentlichen können nur Personen mit Schreibrechten, also nur du, solange du niemanden unter *Settings → Collaborators* einträgst. Die Rulesets schützen zusätzlich vor Versehen (Force-Push, gelöschter Branch) und gelten auch, falls später jemand mitarbeitet.

*Settings → Rules → Rulesets → New ruleset → New branch ruleset*, Name `main`:

- Enforcement status: **Active**
- Target branches: **Include default branch**
- Bypass list: **Repository admin** (damit du allein weiter direkt pushen kannst; ohne Bypass geht alles nur über Pull Requests)
- Regeln: **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** (Required approvals: 0, sonst kannst du allein nie mergen), **Require status checks to pass** mit den Checks `test` und `rust` aus der CI.

*New ruleset → New tag ruleset*, Name `release-tags`:

- Enforcement status: **Active**
- Target tags: **Include by pattern** `v*`
- Bypass list: **Repository admin**
- Regeln: **Restrict creations**, **Restrict updates**, **Restrict deletions**

Damit kann nur ein Admin einen Release-Tag anlegen, verschieben oder löschen.

### Actions

*Settings → Actions → General*:

- **Fork pull request workflows from outside collaborators**: „Require approval for all external contributors“. Fremde Pull Requests starten die CI erst nach deinem Klick. Secrets bekommen Forks ohnehin nicht.
- **Workflow permissions**: „Read repository contents and packages permissions“. Der Release-Workflow fordert sich `contents: write` selbst an.
- **Allow GitHub Actions to create and approve pull requests**: aus.

### Sicherheit

*Settings → Code security*: **Dependabot alerts**, **Secret scanning** mit **Push protection** und **Private vulnerability reporting** einschalten. `.github/dependabot.yml` schlägt einmal im Monat Updates für npm, Cargo und die Actions als Pull Request vor.

## Einmalig: vor dem Öffentlichmachen

Beim Umstellen auf öffentlich wird die **komplette Git-Historie** sichtbar, nicht nur der aktuelle Stand. Frühere Fassungen von `tests/fixtures/meldebogen-vorlage-2026.xls` enthielten in den Datei-Eigenschaften (Autor, zuletzt gespeichert von) die Namen der ursprünglichen Ersteller:innen. Seit M6 sind diese Felder leer.

Am einfachsten ist es, die Historie vor dem Öffentlichmachen zu einem einzigen Commit zusammenzufassen. Das Projekt ist jung, es geht wenig verloren:

```powershell
git checkout --orphan neu
git add -A
git commit -m "chore: erste öffentliche Fassung"
git branch -D main
git branch -m main
git push --force origin main
```

Danach prüfen: keine weiteren Branches oder Tags mit alter Historie (`git ls-remote origin`), keine offenen Pull Requests. Alternativ ein neues, leeres Repository anlegen und diesen Stand dorthin pushen.

Kontrolle, ob irgendwo noch Namen in Excel-Dateien stecken (Python mit `pip install olefile`):

```powershell
python -c "import olefile,glob; [print(f, olefile.OleFileIO(f).get_metadata().author, olefile.OleFileIO(f).get_metadata().last_saved_by) for f in glob.glob('tests/fixtures/*.xls')]"
```

Für `.xlsx` stehen Autor:innen in `docProps/core.xml` im ZIP. In Excel: *Datei → Informationen → Auf Probleme prüfen → Dokument prüfen* entfernt diese Angaben.

## Ein Release erstellen

Vorher `git pull` und `npm ci` (nicht `npm install`, siehe README).

1. Während der Entwicklung jede nennenswerte Änderung unter `## [Unveröffentlicht]` in `CHANGELOG.md` eintragen (Hinzugefügt, Geändert, Behoben). Der Text erscheint später im Programm unter „Was ist neu?“, also für Anwender:innen schreiben.
2. Version festlegen (Semantic Versioning): Fehlerbehebung → `1.0.1`, neue Funktion → `1.1.0`, inkompatible Änderung am Dateiformat → `2.0.0`.
3. Vorbereiten:
   ```powershell
   npm run release:prepare -- 1.1.0
   ```
   Das setzt die Version in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` und `src-tauri/Cargo.lock` und benennt den Changelog-Abschnitt um.
4. Änderungen ansehen, dann:
   ```powershell
   git commit -am "chore(release): v1.1.0"
   git tag v1.1.0
   git push origin main v1.1.0
   ```
5. Unter *Actions* läuft „Release“ (etwa 10–20 Minuten). Danach liegt unter *Releases* ein Entwurf mit:
   - `GVM Trampolin_1.1.0_x64-setup.exe` (Installer)
   - `GVM Trampolin_1.1.0_x64-setup.exe.sig` (Signatur für den Updater)
   - `latest.json` (sagt den Programmen, dass es Version 1.1.0 gibt)
6. Installer herunterladen und kurz testen, dann **Publish release**. Ab jetzt bekommen die installierten Programme das Update angeboten.

Den Text des Releases kannst du vorab anzeigen: `npm run release:notes -- 1.1.0`.

Ging etwas schief (z. B. Build rot), den Tag löschen (`git push origin :refs/tags/v1.1.0` und `git tag -d v1.1.0`), den Fehler beheben und neu taggen. Ein schon veröffentlichtes Release nicht ändern, sondern eine neue Version herausgeben.

### Hinweise

- Programme mit einer Version vor dem Updater (vor 1.0.0) müssen einmal von Hand aktualisiert werden.
- Den Updater testen: Version `x` installieren, Version `x+1` veröffentlichen, Programm starten.
- Der Updater installiert im „passiven“ Modus: kurzes Fortschrittsfenster, keine Fragen.

## Code-Signing (SmartScreen)

Die Update-Signatur oben schützt die Updates, sagt Windows aber nichts. Ohne Authenticode-Zertifikat warnt SmartScreen beim ersten Installieren („Trotzdem ausführen“). Möglichkeiten:

- **SignPath Foundation**: kostenlos für Open-Source-Projekte mit OSI-Lizenz (MIT passt). Bewerbung mit dem öffentlichen Repository; signiert wird dann in GitHub Actions über SignPath.
- **Certum Open Source Code Signing**: günstiges Zertifikat für Open-Source-Entwickler:innen (rund 30–60 € im Jahr, Identitätsprüfung nötig).

Beides lässt sich später ergänzen, ohne den Updater zu ändern.
