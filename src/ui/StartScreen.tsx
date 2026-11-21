import { useState, type FormEvent } from "react";
import { createCompetition } from "../core";
import {
  fileName,
  FileLockedError,
  forgetRecentFile,
  loadRecentFiles,
  pickCompetitionSavePath,
  pickCompetitionToOpen,
} from "../platform";
import type { CompetitionFile } from "../state/useCompetitionFile";

interface Props {
  file: CompetitionFile;
  version: string;
  onShowWhatsNew: () => void;
}

export function StartScreen({ file, version, onShowWhatsNew }: Props) {
  const [name, setName] = useState(`Gau-Vereinsmeisterschaften Trampolin ${new Date().getFullYear()}`);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [recent, setRecent] = useState(loadRecentFiles);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const path = await pickCompetitionSavePath(name);
      if (path) await file.create(createCompetition({ name, date, location }), path);
    });
  }

  function onOpen() {
    void run(async () => {
      const path = await pickCompetitionToOpen();
      if (path) await file.openPath(path);
    });
  }

  function onOpenRecent(path: string) {
    void run(async () => {
      try {
        await file.openPath(path);
      } catch (e) {
        // Woanders geöffnet heißt nicht, dass die Datei fehlt.
        if (e instanceof FileLockedError) throw e;
        forgetRecentFile(path);
        setRecent(loadRecentFiles());
        throw e;
      }
    });
  }

  return (
    <div className="start">
      <header>
        <h1>GVM Trampolin</h1>
        <p className="muted">Auswertung der Gau-Vereinsmeisterschaften im Trampolinturnen</p>
      </header>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="start-grid">
        <form className="card" onSubmit={onCreate}>
          <h2>Neuer Wettkampf</h2>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Ort
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Linkenheim" />
          </label>
          <p className="muted small">
            Im nächsten Schritt wählst du, wo die Wettkampfdatei gespeichert wird. Jede Änderung wird
            automatisch gesichert.
          </p>
          <button type="submit">Anlegen und speichern …</button>
        </form>

        <section className="card">
          <h2>Wettkampf öffnen</h2>
          <button className="button-secondary" onClick={onOpen}>
            Datei öffnen …
          </button>
          {recent.length > 0 && (
            <>
              <h3>Zuletzt geöffnet</h3>
              <ul className="recent">
                {recent.map((path) => (
                  <li key={path}>
                    <button className="link" onClick={() => onOpenRecent(path)} title={path}>
                      {fileName(path)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
      <footer className="muted small">
        Version {version} ·{" "}
        <button className="link" onClick={onShowWhatsNew}>
          Was ist neu?
        </button>
      </footer>
    </div>
  );
}
