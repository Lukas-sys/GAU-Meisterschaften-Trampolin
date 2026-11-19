import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  emptyRoutine,
  formatPoints,
  getRoutine,
  ROUND_LABELS,
  ROUTINE_STATE_LABELS,
  routineBreakdown,
  routineDeduction,
  routineIssues,
  routineState,
  setRoutine,
  teamLabel,
  type Competition,
  type RoundKind,
  type RoutineEntry,
  type StartListRow,
} from "../core";
import { NumberInput } from "./NumberInput";

interface Props {
  competition: Competition;
  row: StartListRow;
  round: RoundKind;
  update: (change: (c: Competition) => Competition) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/** Eine Folie: wer springt, Eingabe der Noten, sofort berechnete Punkte. */
export function RoutineSlide({ competition, row, round, update, hasPrevious, hasNext, onPrevious, onNext }: Props) {
  const { athlete, team } = row;
  const panel = competition.panel;
  const stored = getRoutine(competition, round, athlete.id);
  const entry = stored ?? emptyRoutine(panel);
  const state = routineState(stored, panel);
  const breakdown = routineBreakdown(competition, athlete, round, stored);
  const issues = routineIssues(stored, panel);
  const deduction = routineDeduction(competition, athlete, round);
  const [confirmClear, setConfirmClear] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
  }, []);

  const save = (change: Partial<RoutineEntry>) =>
    update((c) => {
      const base = getRoutine(c, round, athlete.id) ?? emptyRoutine(c.panel);
      return setRoutine(c, round, athlete.id, { ...base, ...change });
    });

  const setNote = (kind: "execution" | "hd", i: number, value: number | undefined) => {
    const notes = [...entry[kind]];
    notes[i] = value ?? null;
    save({ [kind]: notes });
  };

  /** Enter springt zur nächsten Übung, Umschalt+Enter zur vorherigen. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    if (event.shiftKey) {
      if (hasPrevious) onPrevious();
    } else if (hasNext) onNext();
  }

  const fieldClass = (field: string) => {
    const issue = issues.find((i) => i.field === field);
    return issue ? `num score-input ${issue.severity}` : "num score-input";
  };

  return (
    <section className={`card slide slide-state-${state}`} aria-label="Wertung">
      <header className="slide-header">
        <div className="slide-number" aria-label="Startnummer">
          {row.startNumber}
        </div>
        <div className="slide-person">
          <h2>
            {athlete.firstName} <strong>{athlete.lastName}</strong>
          </h2>
          <p className="muted">
            {teamLabel(team)} · Jg. {athlete.birthYear || "–"} · {ROUND_LABELS[round]}
            {round === "pflicht" && (
              <>
                {" "}
                · Pflicht {athlete.pflichtLevel ?? "–"}
                {deduction > 0 && <span className="has-deduction"> · Abzug {formatPoints(deduction)}</span>}
              </>
            )}
          </p>
        </div>
        <span className={`state-pill state-${state}`}>{ROUTINE_STATE_LABELS[state]}</span>
      </header>

      {state === "absent" ? (
        <div className="slide-absent">
          <p>Nicht angetreten. Die Übung zählt nicht für die Mannschaft.</p>
          <button className="button-secondary" onClick={() => save({ status: "entered" })}>
            Doch angetreten
          </button>
        </div>
      ) : (
        <div className="score-form" ref={formRef} onKeyDown={onKeyDown}>
          <fieldset>
            <legend>Haltung</legend>
            {Array.from({ length: panel.executionJudges }, (_, i) => (
              <label key={i}>
                E{i + 1}
                <NumberInput
                  decimal
                  ariaLabel={`E${i + 1}`}
                  className={fieldClass(`E${i + 1}`)}
                  value={entry.execution[i] ?? undefined}
                  onChange={(v) => setNote("execution", i, v)}
                />
              </label>
            ))}
          </fieldset>
          {panel.hdJudges > 0 && (
            <fieldset>
              <legend>HD</legend>
              {Array.from({ length: panel.hdJudges }, (_, i) => (
                <label key={i}>
                  HD{i + 1}
                  <NumberInput
                    decimal
                    ariaLabel={`HD${i + 1}`}
                    className={fieldClass(`HD${i + 1}`)}
                    value={entry.hd[i] ?? undefined}
                    onChange={(v) => setNote("hd", i, v)}
                  />
                </label>
              ))}
            </fieldset>
          )}
          <fieldset>
            <legend>Weitere</legend>
            <label>
              D
              <NumberInput
                decimal
                ariaLabel="D"
                className={fieldClass("D")}
                value={entry.difficulty}
                onChange={(v) => save({ difficulty: v })}
              />
            </label>
            {panel.timeOfFlight && (
              <label>
                ToF
                <NumberInput
                  decimal
                  ariaLabel="ToF"
                  className={fieldClass("ToF")}
                  value={entry.timeOfFlight}
                  onChange={(v) => save({ timeOfFlight: v })}
                />
              </label>
            )}
            <label title="Sonstiger Abzug, positiv eintragen">
              Sonst.
              <NumberInput
                decimal
                ariaLabel="Sonstiger Abzug"
                className={fieldClass("Sonst")}
                value={entry.otherDeduction}
                onChange={(v) => save({ otherDeduction: v })}
              />
            </label>
            <label title="Anzahl gewerteter Sprünge, nur Information">
              ab
              <NumberInput
                ariaLabel="ab"
                className={fieldClass("ab")}
                value={entry.completedElements}
                onChange={(v) => save({ completedElements: v })}
              />
            </label>
          </fieldset>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="inline-issues slide-issues">
          {issues.map((issue, i) => (
            <li key={i} className={issue.severity}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {state !== "absent" && (
        <div className="score-summary" aria-live="polite">
          {breakdown ? (
            <>
              <Part label="Haltung" value={breakdown.execution} />
              {panel.hdJudges > 0 && <Part label="HD" value={breakdown.hd} sign="+" />}
              <Part label="D" value={breakdown.difficulty} sign="+" />
              {panel.timeOfFlight && <Part label="ToF" value={breakdown.timeOfFlight} sign="+" />}
              {breakdown.pflichtDeduction > 0 && <Part label="Pflichtabzug" value={breakdown.pflichtDeduction} sign="−" />}
              {breakdown.otherDeduction > 0 && <Part label="Sonst." value={breakdown.otherDeduction} sign="−" />}
              <span className="score-total">
                <span className="muted small">Punkte</span>
                {formatPoints(breakdown.total)}
              </span>
            </>
          ) : (
            <span className="muted">Punkte erscheinen, sobald alle Haltungs- und HD-Noten eingetragen sind.</span>
          )}
        </div>
      )}

      <footer className="slide-footer">
        <button className="button-secondary" onClick={onPrevious} disabled={!hasPrevious}>
          ◀ Zurück
        </button>
        {state !== "absent" && (
          <button className="button-secondary" onClick={() => save({ status: "absent" })}>
            Nicht angetreten
          </button>
        )}
        {stored &&
          (confirmClear ? (
            <span className="confirm">
              <span>Eingaben löschen?</span>
              <button
                className="button-danger"
                onClick={() => {
                  update((c) => setRoutine(c, round, athlete.id, undefined));
                  setConfirmClear(false);
                }}
              >
                Löschen
              </button>
              <button className="button-secondary" onClick={() => setConfirmClear(false)}>
                Abbrechen
              </button>
            </span>
          ) : (
            <button className="link" onClick={() => setConfirmClear(true)}>
              Eingaben löschen
            </button>
          ))}
        <div className="spacer" />
        <button onClick={onNext} disabled={!hasNext} title="Enter">
          Weiter ▶
        </button>
      </footer>
    </section>
  );
}

function Part({ label, value, sign }: { label: string; value: number; sign?: string }) {
  return (
    <span className="score-part">
      <span className="muted small">{label}</span>
      {sign && <span className="score-sign">{sign}</span>}
      {formatPoints(value)}
    </span>
  );
}
