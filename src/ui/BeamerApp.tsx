import { useEffect, useState } from "react";
import { subscribeBeamer, toggleFullscreen } from "../beamerChannel";
import { formatPoints, type BeamerRoutine, type BeamerView } from "../core";
import "./Beamer.css";

/** Inhalt des Beamer-Fensters. Zeigt nur an, was das Hauptfenster schickt. */
export function BeamerApp() {
  const [view, setView] = useState<BeamerView | null>(null);
  const [connected, setConnected] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(
    () =>
      subscribeBeamer((next) => {
        setConnected(true);
        setView(next);
      }),
    [],
  );

  useEffect(() => {
    document.title = "GVM Trampolin – Beamer";
    const timer = setTimeout(() => setHint(false), 6000);
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "F11" ||
        (event.key === "f" && !event.ctrlKey && !event.metaKey)
      ) {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="beamer" onDoubleClick={() => void toggleFullscreen()}>
      {!view ? (
        <div className="beamer-pause">
          <h1>GVM Trampolin</h1>
          <p>
            {connected
              ? "Kein Wettkampf geöffnet."
              : "Warte auf das Hauptfenster …"}
          </p>
        </div>
      ) : view.mode === "pause" ? (
        <div className="beamer-pause">
          <h1>{view.title}</h1>
        </div>
      ) : (
        <>
          <header className="beamer-header">
            <div>
              <div className="beamer-title">{view.title}</div>
              <div className="beamer-subtitle">{view.subtitle}</div>
            </div>
            <div className="beamer-progress">
              {view.progress.scored} / {view.progress.total}
            </div>
          </header>
          {view.mode === "standings" ? (
            <main className="beamer-standings-only">
              <Standings view={view} />
            </main>
          ) : (
            <main className="beamer-main">
              <section className="beamer-left">
                {view.current && (
                  <Current
                    routine={view.current}
                    compact={
                      view.latest?.startNumber === view.current.startNumber
                    }
                  />
                )}
                {view.next.length > 0 && (
                  <div className="beamer-next">
                    <span className="beamer-label">Als Nächstes</span>
                    {view.next.map((n, i) => (
                      <div key={i}>
                        {n.name}{" "}
                        <span className="beamer-muted">· {n.team}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="beamer-right">
                <Standings view={view} />
              </section>
            </main>
          )}
          {view.mode === "routine" && view.latest && (
            <LatestScore routine={view.latest} />
          )}
        </>
      )}
      {hint && (
        <div className="beamer-hint">F11 oder Doppelklick: Vollbild</div>
      )}
    </div>
  );
}

/** compact: Einzelwerte stehen schon in der Leiste unten, im Kasten nur die Endnote. */
function Current({
  routine,
  compact,
}: {
  routine: BeamerRoutine;
  compact?: boolean;
}) {
  const { score } = routine;
  return (
    <div className="beamer-current">
      <div className="beamer-startnumber">{routine.startNumber}</div>
      <div className="beamer-name">{routine.name}</div>
      <div className="beamer-team">{routine.team}</div>
      {routine.state === "absent" ? (
        <div className="beamer-total beamer-muted">nicht angetreten</div>
      ) : score ? (
        <>
          <div className="beamer-total">{formatPoints(score.total)}</div>
          {!compact && (
            <div className="beamer-parts">
              <Part label="Haltung" value={score.execution} />
              <Part label="HD" value={score.hd} />
              <Part label="Schwierigkeit" value={score.difficulty} />
              {score.timeOfFlight > 0 && (
                <Part label="ToF" value={score.timeOfFlight} />
              )}
              {score.deduction > 0 && (
                <Part label="Abzug" value={-score.deduction} />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="beamer-total beamer-waiting">–</div>
      )}
    </div>
  );
}

function Part({ label, value }: { label: string; value: number }) {
  return (
    <div className="beamer-part">
      <span className="beamer-label">{label}</span>
      <span>
        {value < 0 ? `−${formatPoints(-value)}` : formatPoints(value)}
      </span>
    </div>
  );
}

/** Leiste über die ganze Breite: letzte Wertung mit allen Einzelnoten. */
function LatestScore({ routine }: { routine: BeamerRoutine }) {
  const { score, notes } = routine;
  if (!score || !notes) return null;
  return (
    <footer className="beamer-latest">
      <div className="beamer-latest-who">
        <span className="beamer-label">Letzte Wertung</span>
        <span className="beamer-startnumber">{routine.startNumber}</span>
        <strong>{routine.name}</strong>
        <span className="beamer-muted">· {routine.team}</span>
      </div>
      <div className="beamer-latest-scores">
        <div className="beamer-latest-group">
          {notes.execution.map((n, i) => (
            <Note
              key={i}
              label={`E${i + 1}`}
              value={n}
              dropped={notes.dropped.includes(i)}
            />
          ))}
          <Note label="Haltung" value={score.execution} sum />
        </div>
        {notes.hd.length > 0 && (
          <div className="beamer-latest-group">
            {notes.hd.length > 1 &&
              notes.hd.map((n, i) => (
                <Note key={i} label={`HD${i + 1}`} value={n} />
              ))}
            <Note label="HD" value={score.hd} sum />
          </div>
        )}
        <div className="beamer-latest-group">
          <Note label="D" value={score.difficulty} sum />
          {score.timeOfFlight > 0 && (
            <Note label="ToF" value={score.timeOfFlight} sum />
          )}
          {score.deduction > 0 && (
            <Note label="Abzug" value={-score.deduction} sum />
          )}
        </div>
        <div className="beamer-latest-total">{formatPoints(score.total)}</div>
      </div>
    </footer>
  );
}

function Note({
  label,
  value,
  dropped,
  sum,
}: {
  label: string;
  value: number;
  dropped?: boolean;
  sum?: boolean;
}) {
  const classes = ["beamer-note", dropped ? "dropped" : "", sum ? "sum" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <span className="beamer-label">{label}</span>
      <span>
        {value < 0 ? `−${formatPoints(-value)}` : formatPoints(value)}
      </span>
    </div>
  );
}

function Standings({ view }: { view: BeamerView }) {
  const { columns, rows } = view.standings;
  return (
    <table className="beamer-table">
      <thead>
        <tr>
          <th className="beamer-num">Platz</th>
          <th>Mannschaft</th>
          {columns.map((c) => (
            <th key={c} className="beamer-num">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.team}
            className={row.highlight ? "beamer-highlight" : undefined}
          >
            <td className="beamer-num">
              {row.rank}
              {row.tie && " ="}
            </td>
            <td>{row.team}</td>
            {row.points.map((p, i) => (
              <td
                key={i}
                className={
                  i === row.points.length - 1
                    ? "beamer-num beamer-sum"
                    : "beamer-num"
                }
              >
                {p === null ? "–" : formatPoints(p)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
