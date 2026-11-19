import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import {
  classStartList,
  classTeamOrder,
  formatPoints,
  getRoutine,
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
import { RoutineSlide } from "./RoutineSlide";
import { availableRounds } from "./StartListsPage";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
  onGoToStartLists: () => void;
  beamer: BeamerControl;
  runState: RunState;
  setRunState: Dispatch<SetStateAction<RunState>>;
}

/** Wo im Wettkampfmodus man gerade ist: Klasse, Durchgang und Übung je Durchgang. */
export interface RunState {
  classId: ClassId;
  round: RoundKind;
  /** Position in der Startliste je „Klasse:Durchgang“. */
  positions: Record<string, number>;
}

export const initialRunState: RunState = { classId: "OK", round: "pflicht", positions: {} };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

/** Wettkampfmodus: eine Folie je Übung, Startreihenfolge zum Springen und Live-Tabelle. */
export function CompetitionPage({ competition, update, onGoToStartLists, beamer, runState, setRunState }: Props) {
  // Liegt in App, damit Klasse, Durchgang und Übung beim Seitenwechsel erhalten bleiben.
  const { classId, round: selectedRound, positions } = runState;
  const setClassId = (next: ClassId) => setRunState((s) => ({ ...s, classId: next }));
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
        <div className="segmented" role="tablist" aria-label="Klasse">
          {Object.values(competition.classes).map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === classId}
              className={c.id === classId ? "active" : ""}
              onClick={() => setClassId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
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
              key={`${viewKey}:${current.athlete.id}`}
              competition={competition}
              row={current}
              round={round}
              update={update}
              hasPrevious={index > 0}
              hasNext={index < rows.length - 1}
              onPrevious={() => goTo(index - 1)}
              onNext={() => goTo(index + 1)}
            />
            <NextUp rows={rows} index={index} />
            <p className="muted small keyboard-hint">
              Tastatur: Tab = nächstes Feld · Enter = nächste Übung · Umschalt+Enter = vorherige · Bild auf/ab = blättern
            </p>
          </div>
          <LiveTable competition={competition} classId={classId} round={round} highlightTeamId={current.team.id} />
        </div>
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
