import { useEffect, useRef, useState } from "react";
import { version } from "../package.json";
import { competitionYear, validateCompetition, type ClassId, type Competition } from "./core";
import { fileName, pickCompetitionSavePath } from "./platform";
import { useBeamer } from "./state/useBeamer";
import { useCompetitionFile, type SaveState } from "./state/useCompetitionFile";
import { CompetitionPage, initialRunState, type RunState } from "./ui/CompetitionPage";
import { useEditGuard } from "./ui/EditGuard";
import { Modal } from "./ui/Modal";
import { OverviewPage } from "./ui/OverviewPage";
import { ResultsPage } from "./ui/ResultsPage";
import { StartListsPage } from "./ui/StartListsPage";
import { StartScreen } from "./ui/StartScreen";
import { TeamsPage } from "./ui/TeamsPage";
import { UpdatedHint } from "./ui/UpdatedHint";
import { UpdateNotice } from "./ui/UpdateNotice";
import { WhatsNewDialog } from "./ui/WhatsNewDialog";
import "./App.css";

type Page = "overview" | "teams" | "startlists" | "competition" | "results";

/** Seiten, auf denen die Klassenauswahl in der Reiterleiste gilt. */
const CLASS_PAGES: Page[] = ["teams", "startlists", "competition", "results"];

const PAGES: { id: Page; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "teams", label: "Meldungen" },
  { id: "startlists", label: "Startlisten" },
  { id: "competition", label: "Wettkampf" },
  { id: "results", label: "Ergebnisse" },
];

const SAVE_LABELS: Record<SaveState, string> = {
  saved: "Gespeichert",
  pending: "Speichert …",
  error: "Speichern fehlgeschlagen",
  conflict: "Nicht gespeichert",
};

export default function App() {
  const file = useCompetitionFile();
  const [page, setPage] = useState<Page>("overview");
  const [whatsNew, setWhatsNew] = useState(false);
  const { competition, path } = file;
  const beamer = useBeamer(competition);
  const headerRef = useRef<HTMLElement>(null);
  const compact = useScrolledPast(headerRef, Boolean(competition));
  // Stelle im Wettkampfmodus; gilt bis der Wettkampf geschlossen wird.
  const [runState, setRunState] = useState<RunState>(initialRunState);
  // Gewählte Klasse für Meldungen, Startlisten, Wettkampf und Ergebnisse; gilt bis zum Schließen.
  const [selectedClass, setClassId] = useState<ClassId | null>(null);
  const competitionId = competition?.id;
  useEffect(() => {
    setRunState(initialRunState);
    setClassId(null);
  }, [competitionId]);
  const guard = useEditGuard(competition, file.update, page);
  const [conflictDialog, setConflictDialog] = useState<"reload" | "close" | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  useEffect(() => setConflictError(null), [path]);

  // Update-Hinweise liegen außerhalb der Seiten, damit sie beim Öffnen/Schließen erhalten bleiben.
  const notices = (
    <>
      <div className="notices">
        <UpdateNotice beforeInstall={file.flush} />
        <UpdatedHint version={version} onShowWhatsNew={() => setWhatsNew(true)} />
      </div>
      {whatsNew && <WhatsNewDialog version={version} onClose={() => setWhatsNew(false)} />}
    </>
  );

  if (!competition || !path) {
    return (
      <>
        {notices}
        <StartScreen file={file} version={version} onShowWhatsNew={() => setWhatsNew(true)} />
      </>
    );
  }

  const errorCount = validateCompetition(competition).filter((i) => i.severity === "error").length;
  const classIds = Object.keys(competition.classes) as ClassId[];
  const classId = selectedClass && competition.classes[selectedClass] ? selectedClass : classIds[0];
  const showClasses = CLASS_PAGES.includes(page);
  const inConflict = file.saveState === "conflict";

  async function runConflictAction(action: () => Promise<void>) {
    setConflictError(null);
    try {
      await action();
      setConflictDialog(null);
    } catch (error) {
      setConflictError(error instanceof Error ? error.message : String(error));
    }
  }

  const saveAsNewFile = () =>
    runConflictAction(async () => {
      const current = fileName(path).replace(/\.gvm$/i, "");
      const target = await pickCompetitionSavePath(`${current} (eigener Stand)`);
      if (target) await file.saveAs(target);
    });

  const closeCompetition = () => {
    if (inConflict) setConflictDialog("close");
    else void file.close();
  };

  return (
    <div className={showClasses ? `shell class-accent-${classId}` : "shell"}>
      <header className="shell-header" ref={headerRef}>
        <div>
          <h1>{competition.name || "Unbenannter Wettkampf"}</h1>
          <p className="muted">
            {[competition.location, competitionYear(competition) || null, fileName(path)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="header-actions">
          <span className={`save-state save-${file.saveState}`} title={file.saveError ?? undefined}>
            {SAVE_LABELS[file.saveState]}
          </span>
          <button className="button-secondary" onClick={closeCompetition}>
            Wettkampf schließen
          </button>
        </div>
      </header>
      <nav className={compact ? "tabs compact" : "tabs"} aria-label="Bereiche">
        {compact && (
          <span className="tabs-title" title={competition.name}>
            {competition.name || "Unbenannter Wettkampf"}
          </span>
        )}
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={p.id === page ? "tab active" : "tab"}
            onClick={() => setPage(p.id)}
          >
            {p.label}
            {p.id === "teams" && errorCount > 0 && <span className="badge">{errorCount}</span>}
          </button>
        ))}
        {showClasses && <ClassSwitcher competition={competition} classId={classId} onChange={setClassId} />}
        {compact && (
          <span className={`save-state save-${file.saveState} tabs-save`} title={file.saveError ?? undefined}>
            {SAVE_LABELS[file.saveState]}
          </span>
        )}
      </nav>
      {inConflict && (
        <div className="conflict-banner" role="alert">
          <p className="tight">
            <strong>Die Datei wurde außerhalb dieses Fensters geändert.</strong> Deine letzten Änderungen sind noch
            nicht gespeichert.
          </p>
          <div className="conflict-actions">
            <button onClick={() => void saveAsNewFile()}>Meinen Stand als neue Datei speichern …</button>
            <button className="button-secondary" onClick={() => setConflictDialog("reload")}>
              Datei neu laden
            </button>
          </div>
          {conflictError && !conflictDialog && <p className="tight small">{conflictError}</p>}
        </div>
      )}
      {conflictDialog === "reload" && (
        <Modal
          title="Datei neu laden?"
          onClose={() => setConflictDialog(null)}
          footer={
            <>
              <button className="button-secondary" autoFocus onClick={() => setConflictDialog(null)}>
                Abbrechen
              </button>
              <button className="button-danger" onClick={() => void runConflictAction(file.reload)}>
                Neu laden
              </button>
            </>
          }
        >
          <p>
            Geladen wird der Stand, der jetzt in der Datei steht. Deine nicht gespeicherten Änderungen in diesem Fenster
            gehen dabei verloren.
          </p>
          {conflictError && <p className="alert alert-error small">{conflictError}</p>}
        </Modal>
      )}
      {conflictDialog === "close" && (
        <Modal
          title="Wettkampf schließen?"
          onClose={() => setConflictDialog(null)}
          footer={
            <>
              <button className="button-secondary" autoFocus onClick={() => setConflictDialog(null)}>
                Abbrechen
              </button>
              <button className="button-secondary" onClick={() => void saveAsNewFile()}>
                Als neue Datei speichern …
              </button>
              <button className="button-danger" onClick={() => void runConflictAction(file.close)}>
                Ohne Speichern schließen
              </button>
            </>
          }
        >
          <p>
            Deine letzten Änderungen sind nicht gespeichert, weil die Datei außerhalb dieses Fensters geändert wurde.
            Beim Schließen ohne Speichern gehen sie verloren.
          </p>
          {conflictError && <p className="alert alert-error small">{conflictError}</p>}
        </Modal>
      )}
      <main className="page">
        {page === "overview" && <OverviewPage competition={competition} update={guard.update} />}
        {page === "teams" && (
          <TeamsPage competition={competition} update={guard.update} classId={classId} setClassId={setClassId} />
        )}
        {page === "startlists" && (
          <StartListsPage competition={competition} update={guard.update} classId={classId} />
        )}
        {guard.dialog}
        {page === "results" && (
          <ResultsPage competition={competition} update={file.update} classId={classId} />
        )}
        {page === "competition" && (
          <CompetitionPage
            competition={competition}
            update={file.update}
            onGoToStartLists={() => setPage("startlists")}
            onGoToResults={() => setPage("results")}
            beamer={beamer}
            runState={runState}
            setRunState={setRunState}
            classId={classId}
            setClassId={setClassId}
          />
        )}
      </main>
      <footer className="shell-footer">
        GVM Trampolin {version} ·{" "}
        <button className="link" onClick={() => setWhatsNew(true)}>
          Was ist neu?
        </button>
      </footer>
      {notices}
    </div>
  );
}

/** Klassenauswahl in der Reiterleiste; jede Klasse hat eine eigene Akzentfarbe. */
function ClassSwitcher({
  competition,
  classId,
  onChange,
}: {
  competition: Competition;
  classId: ClassId;
  onChange: (classId: ClassId) => void;
}) {
  return (
    <div className="segmented tabs-classes" role="tablist" aria-label="Klasse">
      {Object.values(competition.classes).map((c) => {
        const count = competition.teams.filter((t) => t.classId === c.id).length;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === classId}
            className={c.id === classId ? `class-accent-${c.id} active` : `class-accent-${c.id}`}
            onClick={() => onChange(c.id)}
            title={`${count} ${count === 1 ? "Mannschaft" : "Mannschaften"}`}
          >
            {c.name} <span className="tabs-class-count">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

/** true, sobald `ref` (die Kopfzeile) aus dem Bild gescrollt ist. */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>, active: boolean): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) {
      setPast(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, active]);
  return past;
}
