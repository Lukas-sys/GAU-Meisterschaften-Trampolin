import { useEffect, useState } from "react";
import { routineState, type Competition } from "../core";
import { Modal } from "./Modal";

type Change = (c: Competition) => Competition;

/** true, sobald irgendeine Übung eine Eingabe hat (auch „nicht angetreten“). */
export function scoringStarted(competition: Competition): boolean {
  return Object.values(competition.routines ?? {}).some((entry) => routineState(entry, competition.panel) !== "open");
}

/**
 * Warnt vor Änderungen an Meldungen, Einstellungen oder Startreihenfolge, sobald der Wettkampf
 * läuft. Die erste Änderung auf einer Seite wartet auf eine Bestätigung; danach sind weitere
 * Änderungen auf dieser Seite frei, bis man die Seite wechselt.
 */
export function useEditGuard(competition: Competition | null, update: (change: Change) => void, page: string) {
  const [unlocked, setUnlocked] = useState(false);
  const [pending, setPending] = useState<Change[] | null>(null);

  useEffect(() => {
    setUnlocked(false);
    setPending(null);
  }, [page]);

  const active = competition !== null && scoringStarted(competition) && !unlocked;
  const guarded = (change: Change) => {
    if (!active) update(change);
    else setPending((p) => [...(p ?? []), change]);
  };

  const dialog = pending && (
    <Modal
      title="Wettkampf läuft bereits"
      onClose={() => setPending(null)}
      footer={
        <>
          <button className="button-secondary" autoFocus onClick={() => setPending(null)}>
            Abbrechen
          </button>
          <button
            className="button-danger"
            onClick={() => {
              pending.forEach((change) => update(change));
              setPending(null);
              setUnlocked(true);
            }}
          >
            Trotzdem ändern
          </button>
        </>
      }
    >
      <p>
        Es sind schon Wertungen eingetragen. Änderungen an Meldungen, Einstellungen oder der Startreihenfolge wirken
        sich auf Startlisten, Wertungen und Ergebnisse aus.
      </p>
      <p className="muted small">Soll die Änderung wirklich ausgeführt werden? Bis du die Seite wechselst, wird nicht noch einmal gefragt.</p>
    </Modal>
  );

  return { update: guarded, dialog };
}
