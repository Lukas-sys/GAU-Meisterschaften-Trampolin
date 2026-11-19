import { useEffect, useState } from "react";
import { checkForUpdate, installUpdate, type DownloadProgress, type Update } from "../updater";
import { Markdown } from "./Markdown";
import { Modal } from "./Modal";

interface Props {
  /** Speichert ausstehende Änderungen, bevor der Installer das Programm beendet. */
  beforeInstall: () => Promise<void>;
}

type Phase = { kind: "idle" } | { kind: "installing"; progress: DownloadProgress } | { kind: "error"; message: string };

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Hinweis auf eine neue Version; prüft einmal beim Programmstart. */
export function UpdateNotice({ beforeInstall }: Props) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    let active = true;
    void checkForUpdate().then((found) => active && setUpdate(found));
    return () => {
      active = false;
    };
  }, []);

  if (!update || dismissed) return null;

  async function install() {
    if (!update) return;
    setShowNotes(false);
    setPhase({ kind: "installing", progress: { downloaded: 0 } });
    try {
      await beforeInstall();
      await installUpdate(update, (progress) => setPhase({ kind: "installing", progress }));
    } catch (error) {
      setPhase({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const installing = phase.kind === "installing";
  const progress = installing ? phase.progress : undefined;
  const percent = progress?.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : undefined;

  return (
    <>
      <div className="update-notice no-print" role="status">
        <div className="update-text">
          <strong>Version {update.version} ist verfügbar</strong>
          <span className="muted small"> (installiert: {update.currentVersion})</span>
          {installing && (
            <div className="update-progress">
              <progress max={100} value={percent} aria-label="Download" />
              <span className="muted small">
                {percent !== undefined
                  ? `${percent} %`
                  : progress && progress.downloaded > 0
                    ? `${megabytes(progress.downloaded)} MB`
                    : "Wird geladen …"}
                {percent === 100 && " – wird installiert, das Programm startet gleich neu"}
              </span>
            </div>
          )}
          {phase.kind === "error" && (
            <p className="alert alert-error small tight">Update fehlgeschlagen: {phase.message}</p>
          )}
        </div>
        {!installing && (
          <div className="update-actions">
            {update.body && (
              <button className="button-secondary" onClick={() => setShowNotes(true)}>
                Was ist neu?
              </button>
            )}
            <button onClick={() => void install()}>
              {phase.kind === "error" ? "Erneut versuchen" : "Jetzt aktualisieren"}
            </button>
            <button className="icon-button" aria-label="Später" title="Später" onClick={() => setDismissed(true)}>
              ×
            </button>
          </div>
        )}
      </div>
      {showNotes && (
        <Modal
          title={`Neu in Version ${update.version}`}
          onClose={() => setShowNotes(false)}
          wide
          footer={
            <>
              <button className="button-secondary" onClick={() => setShowNotes(false)}>
                Später
              </button>
              <button onClick={() => void install()}>Jetzt aktualisieren</button>
            </>
          }
        >
          <p className="muted small">
            Der Wettkampf wird vorher gespeichert. Das Programm wird kurz beendet und startet danach neu.
          </p>
          <Markdown source={update.body ?? ""} headingOffset={1} />
        </Modal>
      )}
    </>
  );
}
