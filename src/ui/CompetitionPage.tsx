import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  classStartList,
  classTeamOrder,
  formatPoints,
  getRoutine,
  openRoutines,
  progressOf,
  BEAMER_MODE_LABELS,
  ROUND_LABELS,
  ROUTINE_STATE_LABELS,
  routineBreakdown,
  routineState,
  teamLabel,
  type ClassId,
  type Competition,
  type RoundKind,
  type BeamerMode,
  type StartListRow,
} from "../core";
import { openBeamerWindow } from "../beamerChannel";
import type { BeamerControl } from "../state/useBeamer";
import { LiveTable } from "./LiveTable";
import { Modal } from "./Modal";
import { RoutineSlide } from "./RoutineSlide";
import { availableRounds } from "./StartListsPage";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
  onGoToStartLists: () => void;
  onGoToResults: () => void;
  beamer: BeamerControl;
  runState: RunState;
  setRunState: Dispatch<SetStateAction<RunState>>;
  /** Gewählte Klasse, gilt für alle Seiten (Umschalter in der Reiterleiste). */
  classId: ClassId;
  setClassId: (classId: ClassId) => void;
}

/** Wo im Wettkampfmodus man gerade ist: Durchgang und Übung je Durchgang (die Klasse ist global). */
export interface RunState {
  round: RoundKind;
  /** Position in der Startliste je „Klasse:Durchgang“. */
  positions: Record<string, number>;
}

export const initialRunState: RunState = { round: "pflicht", positions: {} };

type Change = (c: Competition) => Competition;

/** „Ohne Komma tippen“ wird pro Rechner gemerkt. */
const INPUT_TENTHS_KEY = "gvm.inputTenths";
function loadInputTenths(): boolean {
  try {
    return localStorage.getItem(INPUT_TENTHS_KEY) === "1";
  } catch {
    return false;
  }
}

/** „Startnr. 4, 9, 12“; bei sehr vielen nur die ersten. */
function startNumberList(rows: StartListRow[]): string {
  const MAX = 12;
  const numbers = rows.slice(0, MAX).map((row) => row.startNumber).join(", ");
  return `Startnr. ${numbers}${rows.length > MAX ? " …" : ""}`;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

/** Wettkampfmodus: eine Folie je Übung, Startreihenfolge zum Springen und Live-Tabelle. */
export function CompetitionPage({
  competition,
  update,
  onGoToStartLists,
  onGoToResults,
  beamer,
  runState,
  setRunState,
  classId,
  setClassId,
}: Props) {
  const [finished, setFinished] = useState(false);
  // Liegt in App, damit Durchgang und Übung beim Seitenwechsel erhalten bleiben.
  const { round: selectedRound, positions } = runState;
  const setRound = (next: RoundKind) => setRunState((s) => ({ ...s, round: next }));
  const setPositions = (change: (p: Record<string, number>) => Record<string, number>) =>
    setRunState((s) => ({ ...s, positions: change(s.positions) }));

  const rounds = availableRounds(competition, classId);
  const round = rounds.includes(selectedRound) ? selectedRound : rounds[0];
  const rows = useMemo(() => classStartList(competition, classId, round), [competition, classId, round]);
  const states = rows.map((row) => routineState(getRoutine(competition, round, row.athlete.id), competition.panel));
  const progress = progressOf(states);
  const { ordered } = classTeamOrder(competition, classId);

  const viewKey = `${classId}:${round}`;
  const firstOpen = Math.max(
    0,
    states.findIndex((s) => s === "open" || s === "incomplete"),
  );
  const index = Math.min(positions[viewKey] ?? firstOpen, Math.max(rows.length - 1, 0));
  const current = rows[index];

  // Beim ersten Öffnen eines Durchgangs auf die erste offene Übung springen und diese Stelle
  // festhalten; sonst würde die Folie beim Fertigwerden einer Wertung von selbst weiterspringen.
  useEffect(() => {
    if (positions[viewKey] === undefined && rows.length > 0) setPositions((p) => ({ ...p, [viewKey]: firstOpen }));
  }, [viewKey, positions, rows.length, firstOpen]);

  // Der Beamer zeigt immer die Übung, die hier gerade offen ist.
  const { select } = beamer;
  useEffect(() => {
    if (round && rows.length > 0) select({ classId, round, index });
  }, [select, classId, round, index, rows.length]);

  const goTo = (next: number) => {
    if (rows.length === 0) return;
    setPositions((p) => ({ ...p, [viewKey]: Math.max(0, Math.min(rows.length - 1, next)) }));
  };

  const [inputTenths, setInputTenths] = useState(loadInputTenths);
  function changeInputTenths(on: boolean) {
    setInputTenths(on);
    try {
      localStorage.setItem(INPUT_TENTHS_KEY, on ? "1" : "0");
    } catch {
      // Merken ist nur Komfort.
    }
  }

  // Warnung, wenn in der Kür eingetragen wird, solange in der Pflicht derselben Klasse noch
  // Übungen offen sind. Nach „Trotzdem eintragen“ nicht noch einmal, bis Klasse oder Durchgang wechseln.
  const [kuerConfirmed, setKuerConfirmed] = useState(false);
  const [pendingKuer, setPendingKuer] = useState<Change[] | null>(null);
  /** Erzwingt eine frische Folie, wenn eine zurückgehaltene Eingabe verworfen wird. */
  const [slideReset, setSlideReset] = useState(0);
  useEffect(() => {
    setKuerConfirmed(false);
    setPendingKuer(null);
  }, [classId, round]);
  const pflichtOpen = round === "kuer" ? openRoutines(competition, classId, "pflicht") : [];
  /** Eingabefeld, in dem getippt wurde; bekommt nach „Trotzdem eintragen“ den Fokus zurück. */
  const focusBack = useRef<HTMLElement | null>(null);
  const guardedUpdate = (change: Change) => {
    if (round !== "kuer" || kuerConfirmed || pflichtOpen.length === 0) {
      update(change);
      return;
    }
    if (!pendingKuer) focusBack.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingKuer((p) => [...(p ?? []), change]);
  };
  function goToPflicht() {
    const pflichtRows = classStartList(competition, classId, "pflicht");
    const first = pflichtOpen[0] ? pflichtRows.findIndex((row) => row.athlete.id === pflichtOpen[0].athlete.id) : 0;
    setPendingKuer(null);
    setRunState((s) => ({
      ...s,
      round: "pflicht",
      positions: { ...s.positions, [`${classId}:pflicht`]: Math.max(0, first) },
    }));
  }
  function discardPendingKuer() {
    setPendingKuer(null);
    setSlideReset((n) => n + 1);
  }

  // Blättern per Tastatur, wenn gerade kein Eingabefeld aktiv ist; Bild auf/ab funktioniert immer.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "PageDown" || (event.key === "ArrowRight" && !isTyping(event.target))) {
        event.preventDefault();
        goTo(indexRef.current + 1);
      } else if (event.key === "PageUp" || (event.key === "ArrowLeft" && !isTyping(event.target))) {
        event.preventDefault();
        goTo(indexRef.current - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Durchgang">
          {rounds.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === round}
              className={r === round ? "active" : ""}
              onClick={() => setRound(r)}
            >
              {ROUND_LABELS[r]}
            </button>
          ))}
        </div>
        {competition.classes[classId].rounds.includes("finale") && !competition.finals?.[classId] && (
          <span className="muted small">Finale erscheint, sobald die Finalisten unter „Ergebnisse“ bestätigt sind.</span>
        )}
        <div className="spacer" />
        <div className="beamer-controls">
          <button className="button-secondary" onClick={() => void openBeamerWindow()} title="Zweites Fenster für Beamer oder Hallen-Bildschirm">
            Beamer öffnen
          </button>
          <select
            aria-label="Beamer zeigt"
            value={beamer.mode}
            onChange={(e) => beamer.setMode(e.target.value as BeamerMode)}
          >
            {(Object.keys(BEAMER_MODE_LABELS) as BeamerMode[]).map((m) => (
              <option key={m} value={m}>
                Beamer: {BEAMER_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        {rows.length > 0 && (
          <span className="muted small">
            {progress.scored} von {progress.total} gewertet
            {progress.absent > 0 && `, ${progress.absent} nicht angetreten`}
          </span>
        )}
      </div>

      {ordered.length === 0 ? (
        <div className="card empty">
          <p>Für die {competition.classes[classId].name} steht noch keine Mannschaftsreihenfolge fest.</p>
          <button onClick={onGoToStartLists}>Zu den Startlisten</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="card empty">In diesem Durchgang hat niemand einen Startplatz.</p>
      ) : (
        <div className="run-layout">
          <StartOrderNav
            rows={rows}
            states={states}
            competition={competition}
            round={round}
            currentIndex={index}
            onSelect={goTo}
          />
          <div className="run-main">
            <RoutineSlide
              key={`${viewKey}:${current.athlete.id}:${slideReset}`}
              competition={competition}
              row={current}
              round={round}
              update={guardedUpdate}
              inputTenths={inputTenths}
              onInputTenthsChange={changeInputTenths}
              hasPrevious={index > 0}
              hasNext={index < rows.length - 1}
              onPrevious={() => goTo(index - 1)}
              onNext={() => goTo(index + 1)}
              onFinish={() => setFinished(true)}
            />
            <NextUp rows={rows} index={index} />
            <p className="muted small keyboard-hint">
              Tastatur: Tab = nächstes Feld · Enter = nächste Übung · Umschalt+Enter = vorherige · Bild auf/ab = blättern
            </p>
          </div>
          <LiveTable competition={competition} classId={classId} round={round} highlightTeamId={current.team.id} />
        </div>
      )}
      {pendingKuer && (
        <Modal
          title="Pflicht noch nicht fertig"
          onClose={discardPendingKuer}
          footer={
            <>
              <button className="button-secondary" onClick={goToPflicht}>
                Zur Pflicht
              </button>
              <button
                autoFocus
                onClick={() => {
                  pendingKuer.forEach((change) => update(change));
                  setPendingKuer(null);
                  setKuerConfirmed(true);
                  const target = focusBack.current;
                  setTimeout(() => target?.focus(), 0);
                }}
              >
                Trotzdem eintragen
              </button>
            </>
          }
        >
          <p>
            In der Pflicht der {competition.classes[classId].name}{" "}
            {pflichtOpen.length === 1 ? "ist noch 1 Übung offen" : `sind noch ${pflichtOpen.length} Übungen offen`} (
            {startNumberList(pflichtOpen)}). Normalerweise kommt zuerst die Pflicht.
          </p>
        </Modal>
      )}
      {finished && (
        <FinishDialog
          competition={competition}
          classId={classId}
          round={round}
          rows={rows}
          states={states}
          onClose={() => setFinished(false)}
          onJump={(i) => {
            setFinished(false);
            goTo(i);
          }}
          onContinue={(nextClass, nextRound) => {
            setFinished(false);
            setClassId(nextClass);
            setRound(nextRound);
          }}
          onResults={() => {
            setFinished(false);
            onGoToResults();
          }}
        />
      )}
    </div>
  );
}

function StartOrderNav({
  rows,
  states,
  competition,
  round,
  currentIndex,
  onSelect,
}: {
  rows: StartListRow[];
  states: ReturnType<typeof routineState>[];
  competition: Competition;
  round: RoundKind;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(".current")?.scrollIntoView({ block: "nearest" });
  }, [currentIndex]);

  return (
    <nav className="card run-nav" aria-label="Startreihenfolge">
      <h2>Startreihenfolge</h2>
      <ol ref={listRef}>
        {rows.map((row, i) => {
          const state = states[i];
          const breakdown = state === "scored" ? routineBreakdown(competition, row.athlete, round) : undefined;
          const blockStart = i > 0 && rows[i - 1].position !== row.position;
          return (
            <li key={row.athlete.id} className={blockStart ? "block-start" : undefined}>
              <button
                className={i === currentIndex ? "run-nav-item current" : "run-nav-item"}
                aria-current={i === currentIndex ? "step" : undefined}
                onClick={() => onSelect(i)}
                title={`${teamLabel(row.team)} · ${ROUTINE_STATE_LABELS[state]}`}
              >
                <span className="run-nav-nr">{row.startNumber}</span>
                <span className={`state-dot state-${state}`} aria-label={ROUTINE_STATE_LABELS[state]} />
                <span className="run-nav-name">
                  {row.athlete.lastName}
                  {row.athlete.firstName && `, ${row.athlete.firstName.charAt(0)}.`}
                </span>
                <span className="run-nav-points">
                  {breakdown ? formatPoints(breakdown.total) : state === "absent" ? "n. a." : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NextUp({ rows, index }: { rows: StartListRow[]; index: number }) {
  const next = rows.slice(index + 1, index + 3);
  if (next.length === 0) return <p className="next-up muted small">Letzte Übung dieses Durchgangs.</p>;
  return (
    <p className="next-up small">
      <span className="muted">Als Nächstes: </span>
      {next.map((row, i) => (
        <span key={row.athlete.id}>
          {i > 0 && <span className="muted"> · danach </span>}
          <strong>
            {row.athlete.firstName} {row.athlete.lastName}
          </strong>{" "}
          <span className="muted">({teamLabel(row.team)})</span>
        </span>
      ))}
    </p>
  );
}

/** Dialog nach dem letzten Springer eines Durchgangs: Was fehlt noch, und wie geht es weiter? */
function FinishDialog({
  competition,
  classId,
  round,
  rows,
  states,
  onClose,
  onJump,
  onContinue,
  onResults,
}: {
  competition: Competition;
  classId: ClassId;
  round: RoundKind;
  rows: StartListRow[];
  states: ReturnType<typeof routineState>[];
  onClose: () => void;
  onJump: (index: number) => void;
  onContinue: (classId: ClassId, round: RoundKind) => void;
  onResults: () => void;
}) {
  const open = rows.map((row, i) => ({ row, i })).filter(({ i }) => states[i] === "open" || states[i] === "incomplete");
  const config = competition.classes[classId];
  const name = config.name;

  // Je nach gerade beendetem Durchgang genau ein naheliegender nächster Schritt.
  type Action = { key: string; label: string; run: () => void };
  const actions: Action[] = [];
  const continueWith = (c: ClassId, r: RoundKind) =>
    actions.push({
      key: `${c}:${r}`,
      label: c === classId ? `Weiter mit ${ROUND_LABELS[r]}` : `Weiter mit ${competition.classes[c].name} · ${ROUND_LABELS[r]}`,
      run: () => onContinue(c, r),
    });
  const toResults = (label = "Zu den Ergebnissen") => actions.push({ key: "results", label, run: onResults });
  // Pflicht der anderen Klassen, solange dort noch Übungen offen sind.
  const otherPflicht = () =>
    (Object.keys(competition.classes) as ClassId[])
      .filter((c) => c !== classId && openRoutines(competition, c, "pflicht").length > 0)
      .forEach((c) => continueWith(c, "pflicht"));

  if (round === "pflicht" && config.rounds.includes("kuer")) {
    continueWith(classId, "kuer");
  } else if (round === "kuer" && config.rounds.includes("finale")) {
    if (competition.finals?.[classId]) continueWith(classId, "finale");
    else toResults("Zu den Ergebnissen (Finale bestätigen)");
    otherPflicht();
  } else {
    toResults();
    otherPflicht();
  }

  return (
    <Modal
      title={`${name} · ${ROUND_LABELS[round]}`}
      onClose={onClose}
      footer={
        <button className="button-secondary" onClick={onClose}>
          Hier bleiben
        </button>
      }
    >
      {open.length === 0 ? (
        <p>Alle Übungen dieses Durchgangs sind gewertet.</p>
      ) : (
        <div className="alert alert-warning small">
          <p className="tight">
            Noch nicht fertig gewertet:{" "}
            {open
              .map(({ row }) => `Nr. ${row.startNumber} ${row.athlete.firstName} ${row.athlete.lastName}`.trim())
              .join(", ")}
          </p>
          <button className="button-secondary" onClick={() => onJump(open[0].i)}>
            Zur ersten offenen Übung
          </button>
        </div>
      )}
      <div className="finish-actions">
        {actions.map((action, i) => (
          <button key={action.key} className={i === 0 ? undefined : "button-secondary"} onClick={action.run}>
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
