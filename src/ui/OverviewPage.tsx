import { useState } from "react";
import {
  assignJudgeSeat,
  judgeOnSeat,
  judgeSeats,
  newId,
  updateJudge,
  type ClassConfig, type ClassId, type Competition, type JudgePanel } from "../core";
import { CollapsibleCard } from "./CollapsibleCard";
import { DeductionTableEditor } from "./DeductionTableEditor";
import { NumberInput } from "./NumberInput";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
}

interface OverviewProps extends Props {
  /** Ohne Rückfrage „Wettkampf läuft bereits“: Kampfrichter:innen ändern Startlisten und Wertungen nicht. */
  updateJudges: Props["update"];
}

export function OverviewPage({ competition, update, updateJudges }: OverviewProps) {
  const set = <K extends keyof Competition>(key: K, value: Competition[K]) =>
    update((c) => ({ ...c, [key]: value }));
  const setPanel = (change: Partial<JudgePanel>) =>
    update((c) => ({ ...c, panel: { ...c.panel, ...change } }));
  const setClass = (id: ClassId, change: Partial<ClassConfig>) =>
    update((c) => ({ ...c, classes: { ...c.classes, [id]: { ...c.classes[id], ...change } } }));

  const dateLabel = competition.date ? competition.date.split("-").reverse().join(".") : "";
  const panel = competition.panel;
  const panelSummary = [
    `${panel.executionJudges} Haltung`,
    panel.hdJudges === 0 ? "keine HD" : `${panel.hdJudges} HD`,
    panel.timeOfFlight ? "mit ToF" : null,
    `${competition.judges.length} gemeldet`,
  ]
    .filter(Boolean)
    .join(" · ");
  const classSummary = Object.values(competition.classes)
    .map((config) => `${config.id}: ${competition.teams.filter((t) => t.classId === config.id).length} Mannschaften`)
    .join(" · ");

  return (
    <div className="stack">
      <CollapsibleCard
        id="overview.competition"
        title="Wettkampf"
        summary={[competition.name, dateLabel, competition.location].filter(Boolean).join(" · ")}
      >
        <div className="form-grid">
          <label>
            Name
            <input value={competition.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Datum
            <input type="date" value={competition.date} onChange={(e) => set("date", e.target.value)} />
          </label>
          <label>
            Ort
            <input value={competition.location} onChange={(e) => set("location", e.target.value)} />
          </label>
        </div>
        <p className="muted small">
          Das Jahr des Datums bestimmt die Altersklassen und den Pflichtabzug.
        </p>
      </CollapsibleCard>

      <CollapsibleCard id="overview.panel" title="Kampfgericht" summary={panelSummary}>
        <div className="form-grid">
          <label>
            Haltungs-Kampfrichter:innen
            <select
              value={competition.panel.executionJudges}
              onChange={(e) => setPanel({ executionJudges: Number(e.target.value) })}
            >
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            HD-Kampfrichter:innen
            <select
              value={competition.panel.hdJudges}
              onChange={(e) => setPanel({ hdJudges: Number(e.target.value) as JudgePanel["hdJudges"] })}
            >
              <option value={0}>keine HD-Wertung</option>
              <option value={1}>1 (Wert zählt direkt)</option>
              <option value={2}>2 (Mittelwert)</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={competition.panel.timeOfFlight}
              onChange={(e) => setPanel({ timeOfFlight: e.target.checked })}
            />
            Flugzeit (ToF) werten
          </label>
        </div>
        {competition.panel.executionJudges === 3 && (
          <p className="muted small">
            Bei 3 Haltungsnoten wird der Mittelwert der drei als vierte Note ergänzt. Dann zählen wie gewohnt die
            mittleren zwei Noten.
          </p>
        )}
        {competition.panel.executionJudges === 5 && (
          <p className="alert alert-warning small">
            Bei 5 Haltungsnoten werden höchste und niedrigste gestrichen und der Mittelwert der übrigen drei
            verdoppelt. Diese Regel ist noch mit dem Kampfgericht abzustimmen.
          </p>
        )}
        <JudgesList competition={competition} update={updateJudges} />
      </CollapsibleCard>

      <DeductionTableEditor competition={competition} update={update} />

      <CollapsibleCard id="overview.classes" title="Klassen" summary={classSummary}>
        <table className="table compact">
          <thead>
            <tr>
              <th>Klasse</th>
              <th>Mannschaften</th>
              <th>Max. Turner:innen</th>
              <th>Starter je Durchgang</th>
              <th>In Wertung</th>
              <th>Finale</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(competition.classes).map((config) => (
              <tr key={config.id}>
                <td>{config.name}</td>
                <td>{competition.teams.filter((t) => t.classId === config.id).length}</td>
                <td>
                  <NumberInput value={config.maxTeamSize} onChange={(v) => v && setClass(config.id, { maxTeamSize: v })} />
                </td>
                <td>
                  <NumberInput
                    value={config.maxStartersPerRound}
                    onChange={(v) => v && setClass(config.id, { maxStartersPerRound: v })}
                  />
                </td>
                <td>
                  <NumberInput value={config.countingScores} onChange={(v) => v && setClass(config.id, { countingScores: v })} />
                </td>
                <td>
                  {config.finalQualification
                    ? `2/3 der Mannschaften, höchstens ${config.finalQualification.maxTeams ?? "∞"}`
                    : "kein Finale"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleCard>
    </div>
  );
}

function JudgesList({ competition, update }: Props) {
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const seats = judgeSeats(competition.panel);

  function add() {
    if (!name.trim()) return;
    update((c) => ({ ...c, judges: [...c.judges, { id: newId(), name: name.trim(), club: club.trim() }] }));
    setName("");
  }

  function seat(seatId: string, judgeId: string) {
    update((c) => {
      if (judgeId) return assignJudgeSeat(c, judgeId, seatId);
      const current = judgeOnSeat(c, seatId);
      return current ? assignJudgeSeat(c, current.id, undefined) : c;
    });
  }

  return (
    <>
      <h3>Gemeldete Kampfrichter:innen ({competition.judges.length})</h3>
      {competition.judges.length > 0 && (
        <ul className="judges">
          {competition.judges.map((j) => (
            <li key={j.id}>
              <input
                aria-label="Name"
                placeholder="Name"
                value={j.name}
                onChange={(e) => update((c) => updateJudge(c, j.id, { name: e.target.value }))}
              />
              <input
                aria-label="Verein"
                placeholder="Verein"
                value={j.club}
                onChange={(e) => update((c) => updateJudge(c, j.id, { club: e.target.value }))}
              />
              <span className="judge-seat muted small" title="Platz im Kampfgericht">
                {j.seat && seats.includes(j.seat) ? j.seat : ""}
              </span>
              <button
                className="icon-button"
                aria-label={`${j.name} entfernen`}
                onClick={() => update((c) => ({ ...c, judges: c.judges.filter((x) => x.id !== j.id) }))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="inline-form">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Verein" value={club} onChange={(e) => setClub(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="button-secondary" onClick={add}>
          Hinzufügen
        </button>
      </div>

      <h3>Einteilung</h3>
      {competition.judges.length === 0 ? (
        <p className="muted small">Zuerst Kampfrichter:innen eintragen, dann hier die Plätze zuteilen.</p>
      ) : (
        <>
          <div className="seat-grid">
            {seats.map((seatId) => {
              const current = judgeOnSeat(competition, seatId);
              return (
                <label key={seatId}>
                  {seatId}
                  <select value={current?.id ?? ""} onChange={(e) => seat(seatId, e.target.value)}>
                    <option value="">frei</option>
                    {competition.judges.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name || "(ohne Namen)"}
                        {j.seat && j.seat !== seatId && seats.includes(j.seat) ? ` (sitzt auf ${j.seat})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <p className="muted small">
            Jede Person hat einen Platz. Wer schon eingeteilt ist, wechselt beim Auswählen auf den neuen Platz.
          </p>
        </>
      )}
    </>
  );
}
