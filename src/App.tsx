import { useEffect, useRef, useState } from "react";
import { version } from "../package.json";
import { competitionYear, validateCompetition } from "./core";
import { fileName } from "./platform";
import { useBeamer } from "./state/useBeamer";
import { useCompetitionFile, type SaveState } from "./state/useCompetitionFile";
import { CompetitionPage, initialRunState, type RunState } from "./ui/CompetitionPage";
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
  const competitionId = competition?.id;
  useEffect(() => setRunState(initialRunState), [competitionId]);

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

  return (
    <div className="shell">
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
          <button className="button-secondary" onClick={() => void file.close()}>
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
        {compact && (
          <span className={`save-state save-${file.saveState} tabs-save`} title={file.saveError ?? undefined}>
            {SAVE_LABELS[file.saveState]}
          </span>
        )}
      </nav>
      <main className="page">
        {page === "overview" && <OverviewPage competition={competition} update={file.update} />}
        {page === "teams" && <TeamsPage competition={competition} update={file.update} />}
        {page === "startlists" && <StartListsPage competition={competition} update={file.update} />}
        {page === "results" && <ResultsPage competition={competition} update={file.update} />}
        {page === "competition" && (
          <CompetitionPage
            competition={competition}
            update={file.update}
            onGoToStartLists={() => setPage("startlists")}
            beamer={beamer}
            runState={runState}
            setRunState={setRunState}
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
