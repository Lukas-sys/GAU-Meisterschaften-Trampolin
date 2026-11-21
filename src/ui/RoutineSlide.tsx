import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  DEFAULT_COMPLETED_ELEMENTS,
  emptyRoutine,
  formatPoints,
  getRoutine,
  judgeOnSeat,
  missingExecutionFill,
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
import { Modal } from "./Modal";
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
  /** Beim letzten Springer: statt „Weiter“ gibt es „Fertig“. */
  onFinish: () => void;
  /** „Ohne Komma tippen“ für Haltung, HD und Schwierigkeit. */
  inputTenths: boolean;
  onInputTenthsChange: (on: boolean) => void;
}

/** Eine Folie: wer springt, Eingabe der Noten, sofort berechnete Punkte. */
export function RoutineSlide({
  competition,
  row,
  round,
  update,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onFinish,
  inputTenths,
  onInputTenthsChange,
}: Props) {
  const { athlete, team } = row;
  const panel = competition.panel;
  const stored = getRoutine(competition, round, athlete.id);
  const entry = stored ?? emptyRoutine(panel);
  const state = routineState(stored, panel);
  const breakdown = routineBreakdown(competition, athlete, round, stored);
  const issues = routineIssues(stored, panel);
  const deduction = routineDeduction(competition, athlete, round);
  const [confirmClear, setConfirmClear] = useState(false);
  /** Name der eingeteilten Kampfrichter:in für ein Feld, als Hinweis. */
  const judgeTitle = (seat: string) => judgeOnSeat(competition, seat)?.name || undefined;
  /** Fehlende Haltungsnote: wartet auf Bestätigung, danach geht es mit `then` weiter. */
  const [pendingFill, setPendingFill] = useState<{ index: number; value: number; then: () => void } | null>(null);
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
    if (kind === "execution" && entry.filledExecution?.includes(i)) {
      save({ execution: notes, filledExecution: entry.filledExecution.filter((f) => f !== i) });
    } else save({ [kind]: notes });
  };

  /** Vor dem Weiterschalten: fehlt genau eine Haltungsnote, erst fragen, ob sie ergänzt wird. */
  const leave = (then: () => void) => {
    const fill = missingExecutionFill(stored, panel);
    if (fill) setPendingFill({ ...fill, then });
    else then();
  };
  const next = () => leave(hasNext ? onNext : onFinish);

  function applyFill() {
    if (!pendingFill) return;
    const { index, value, then } = pendingFill;
    const notes = [...entry.execution];
    notes[index] = value;
    save({ execution: notes, filledExecution: [...(entry.filledExecution ?? []), index] });
    setPendingFill(null);
    then();
  }

  /** Enter springt zur nächsten Übung, Umschalt+Enter zur vorherigen. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    if (event.shiftKey) {
      if (hasPrevious) leave(onPrevious);
    } else next();
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
        <>
          <label
            className="checkbox small tenths-toggle"
            title="Haltung, HD und D: 67 wird zu 6,7, 100 zu 10. Mit Komma getippt gilt der Wert wie eingegeben."
          >
            <input type="checkbox" checked={inputTenths} onChange={(e) => onInputTenthsChange(e.target.checked)} />
            Ohne Komma tippen
          </label>
          <div className="score-form" ref={formRef} onKeyDown={onKeyDown}>
            <fieldset>
              <legend>Haltung</legend>
              {Array.from({ length: panel.executionJudges }, (_, i) => (
                <label key={i} title={judgeTitle(`E${i + 1}`)}>
                  E{i + 1}
                  <NumberInput
                    decimal
                    tenths={inputTenths}
                    ariaLabel={`E${i + 1}`}
                    className={
                      entry.filledExecution?.includes(i) ? `${fieldClass(`E${i + 1}`)} filled` : fieldClass(`E${i + 1}`)
                    }
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
                  <label key={i} title={judgeTitle(`HD${i + 1}`)}>
                    HD{i + 1}
                    <NumberInput
                      decimal
                      tenths={inputTenths}
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
              <label title={judgeTitle("D")}>
                D
                <NumberInput
                  decimal
                  tenths={inputTenths}
                  ariaLabel="D"
                  className={fieldClass("D")}
                  value={entry.difficulty}
                  onChange={(v) => save({ difficulty: v })}
                />
              </label>
              {panel.timeOfFlight && (
                <label title={judgeTitle("ToF")}>
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
              <label title="Anzahl gewerteter Sprünge, nur Information. Leer = 10.">
                ab
                <NumberInput
                  ariaLabel="ab"
                  placeholder={String(DEFAULT_COMPLETED_ELEMENTS)}
                  className={fieldClass("ab")}
                  value={entry.completedElements}
                  onChange={(v) => save({ completedElements: v })}
                />
              </label>
            </fieldset>
          </div>
        </>
      )}

      {entry.filledExecution && entry.filledExecution.length > 0 && state !== "absent" && (
        <p className="muted small slide-filled">
          {entry.filledExecution.map((i) => `E${i + 1}`).join(", ")} fehlte und wurde mit dem mittleren Wert der
          übrigen Haltungsnoten ergänzt.
        </p>
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
        <button className="button-secondary" onClick={() => leave(onPrevious)} disabled={!hasPrevious}>
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
        <button onClick={next} title="Enter">
          {hasNext ? "Weiter ▶" : "Fertig ✓"}
        </button>
      </footer>
      {pendingFill && (
        <Modal
          title="Haltungsnote fehlt"
          onClose={() => setPendingFill(null)}
          footer={
            <>
              <button className="button-secondary" onClick={() => setPendingFill(null)}>
                Zurück zur Eingabe
              </button>
              <button autoFocus onClick={applyFill}>
                Ergänzen und {hasNext ? "weiter" : "fertig"}
              </button>
            </>
          }
        >
          <p>
            E{pendingFill.index + 1} ist leer. Von den übrigen Haltungsnoten fallen die höchste und die niedrigste weg,
            eingesetzt wird der mittlere Wert: <strong>{formatPoints(pendingFill.value).replace(/0$/, "")}</strong>.
          </p>
        </Modal>
      )}
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
