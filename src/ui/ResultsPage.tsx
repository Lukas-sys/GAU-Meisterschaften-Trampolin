import { useMemo, useState } from "react";
import {
  classResults,
  classStartList,
  completedElementsOf,
  droppedExecutionNotes,
  confirmFinalists,
  finalProposal,
  finalTeams,
  formatPoints,
  getRoutine,
  moveInTie,
  resetFinalists,
  resultsCsv,
  resultsWorkbook,
  routineBreakdown,
  routineState,
  seatedJudges,
  teamLabel,
  VORKAMPF_ROUNDS,
  type Athlete,
  type ClassId,
  type Competition,
  type RoundKind,
  type FinalProposal,
  type FinalStanding,
  type TeamResult,
  type TeamStanding,
  type TieStage,
} from "../core";
import { canWriteXlsx, exportTextFile, exportXlsxFile } from "../platform";
import { PrintDialog, type PrintSettings } from "./PrintDialog";
import { PrintHeader, usePrint } from "./usePrint";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
  /** Gewählte Klasse, gilt für alle Seiten (Umschalter in der Reiterleiste). */
  classId: ClassId;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

/** Offene Übungen im Vorkampf einer Klasse (ohne nicht angetretene). */
function openVorkampfRoutines(competition: Competition, classId: ClassId): number {
  return VORKAMPF_ROUNDS.filter((r) => competition.classes[classId].rounds.includes(r))
    .flatMap((round) => classStartList(competition, classId, round).map((row) => ({ round, row })))
    .filter(({ round, row }) => {
      const state = routineState(getRoutine(competition, round, row.athlete.id), competition.panel);
      return state === "open" || state === "incomplete";
    }).length;
}

/** Mannschaften mit gleicher Punktzahl wie `standing` (und gleicher Wertungsart), in angezeigter Reihenfolge. */
function tieGroup(standings: TeamStanding[], standing: TeamStanding, points: (s: TeamStanding) => number): string[] {
  return standings.filter((s) => points(s) === points(standing)).map((s) => s.teamId);
}

export function ResultsPage({ competition, update, classId }: Props) {
  const [showAthletes, setShowAthletes] = useState(true);
  const [exportNote, setExportNote] = useState<string | null>(null);
  /** Von Hand geänderte Finalauswahl je Klasse; undefined = Vorschlag nach der Regel. */
  const [drafts, setDrafts] = useState<Partial<Record<ClassId, string[]>>>({});
  const { print, portal } = usePrint();
  const [printDialog, setPrintDialog] = useState(false);

  const config = competition.classes[classId];
  const proposal = useMemo(() => finalProposal(competition, classId), [competition, classId]);
  const results = useMemo(() => classResults(competition, classId), [competition, classId]);
  const openCount = openVorkampfRoutines(competition, classId);
  const hasFinalRound = config.rounds.includes("finale");
  const confirmed = competition.finals?.[classId];

  async function exportResults() {
    setExportNote(null);
    try {
      const name = `Ergebnisse ${competition.name}`.trim();
      // Im Browser (nur Entwicklung) gibt es keinen Rust-Teil, dann als CSV.
      const path = canWriteXlsx()
        ? await exportXlsxFile(name, resultsWorkbook(competition))
        : await exportTextFile(name, "csv", "CSV für Excel", resultsCsv(competition));
      if (path) setExportNote(`Gespeichert: ${path}`);
    } catch (error) {
      setExportNote(`Export fehlgeschlagen: ${String(error)}`);
    }
  }

  const printResults = (settings: PrintSettings) =>
    print(
      <>
        {Object.values(competition.classes)
          .filter((c) => competition.teams.some((t) => t.classId === c.id))
          .filter((c) => settings.classes === "all" || settings.classes === c.id)
          .map((c) => (
            <section key={c.id} className="print-page">
              <PrintHeader competition={competition} title={`${c.name} · Ergebnisliste`} />
              <ResultsTable
                competition={competition}
                results={classResults(competition, c.id)}
                classId={c.id}
                showAthletes={settings.athletes === true || settings.notes === true}
                showNotes={settings.notes === true}
                separators={settings.separators === true}
              />
              {settings.notes === true && (
                <p className="print-legend">
                  Gestrichene Haltungsnoten in Klammern. * = fehlende Note, mit dem mittleren Wert ergänzt. „ab“ leer =
                  10.
                </p>
              )}
              {settings.judges === true && seatedJudges(competition).length > 0 && (
                <p className="print-legend">
                  Kampfgericht:{" "}
                  {seatedJudges(competition)
                    .map(({ seat, judge }) => `${seat} ${judge.name}`)
                    .join(" · ")}
                </p>
              )}
            </section>
          ))}
      </>,
    );

  const printWinners = () =>
    print(
      <section className="print-page">
        <PrintHeader competition={competition} title="Siegerliste" />
        {Object.values(competition.classes)
          .filter((c) => competition.teams.some((t) => t.classId === c.id))
          .map((c) => (
            <div key={c.id} className="winners-block">
              <h2>{c.name}</h2>
              <ResultsTable competition={competition} results={classResults(competition, c.id)} classId={c.id} />
            </div>
          ))}
      </section>,
    );

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="spacer" />
        <button className="button-secondary" onClick={() => setPrintDialog(true)} disabled={competition.teams.length === 0}>
          Ergebnisliste drucken
        </button>
        <button className="button-secondary" onClick={printWinners} disabled={competition.teams.length === 0}>
          Siegerliste drucken
        </button>
        <button className="button-secondary" onClick={() => void exportResults()} disabled={competition.teams.length === 0}>
          Als Excel exportieren
        </button>
      </div>
      {exportNote && <p className="alert alert-success small">{exportNote}</p>}

      {results.length === 0 ? (
        <p className="card empty">Keine Mannschaften in der {config.name}.</p>
      ) : (
        <>
          {openCount > 0 && (
            <p className="alert alert-warning small">
              Im Vorkampf der {config.name} sind noch {openCount} Übungen offen oder unvollständig. Der Zwischenstand
              kann sich noch ändern.
            </p>
          )}

          {proposal && (
            <section className="card">
              <h2>Finale</h2>
              {confirmed ? (
                <>
                  <p className="muted small">
                    Bestätigt am {formatDateTime(confirmed.confirmedAt)}. Startreihenfolge im Finale: schwächste
                    Finalmannschaft zuerst.
                  </p>
                  <ol className="team-order">
                    {finalTeams(competition, classId).map((team, i) => (
                      <li key={team.id}>
                        <span className="team-rank">{i + 1}</span>
                        <span className="team-order-name">{teamLabel(team)}</span>
                      </li>
                    ))}
                  </ol>
                  {proposal.outdated && (
                    <div className="alert alert-warning small">
                      <p className="tight">
                        Der Vorkampf hat sich seit der Bestätigung geändert. Nach aktuellem Stand wären im Finale:{" "}
                        {proposal.proposedIds
                          .map((id) => teamLabel(competition.teams.find((t) => t.id === id)!))
                          .join(", ")}
                        .
                      </p>
                      <button
                        className="button-secondary"
                        onClick={() => update((c) => confirmFinalists(c, classId, proposal.proposedIds))}
                      >
                        Aktuellen Stand übernehmen
                      </button>
                    </div>
                  )}
                  <button
                    className="link"
                    onClick={() => {
                      setDrafts((d) => ({ ...d, [classId]: confirmed.teamIds }));
                      update((c) => resetFinalists(c, classId));
                    }}
                  >
                    Auswahl ändern
                  </button>
                </>
              ) : (
                <FinalSelection
                  competition={competition}
                  classId={classId}
                  proposal={proposal}
                  draft={drafts[classId]}
                  setDraft={(ids) => setDrafts((d) => ({ ...d, [classId]: ids }))}
                  onMoveTie={(group, teamId, delta) =>
                    update((c) => moveInTie(c, classId, "vorkampf", group, teamId, delta))
                  }
                  onConfirm={(ids) => {
                    update((c) => confirmFinalists(c, classId, ids));
                    setDrafts((d) => ({ ...d, [classId]: undefined }));
                  }}
                />
              )}
            </section>
          )}

          <section className="card">
            <div className="card-title-row">
              <h2>{hasFinalRound && confirmed ? "Endergebnis" : "Ergebnis Vorkampf"}</h2>
              <div className="spacer" />
              <label className="checkbox small">
                <input type="checkbox" checked={showAthletes} onChange={(e) => setShowAthletes(e.target.checked)} />
                Einzelwertungen anzeigen
              </label>
            </div>
            <ResultsTable
              competition={competition}
              results={results}
              classId={classId}
              showAthletes={showAthletes}
              onMoveTie={(stage, group, teamId, delta) =>
                update((c) => moveInTie(c, classId, stage, group, teamId, delta))
              }
            />
            <p className="muted small">
              Je Durchgang zählen die besten {config.countingScores} (fett).
              {hasFinalRound && confirmed && " Finalmannschaften: Pflicht + Kür + Finale, danach die übrigen nach dem Vorkampf."}
              {" "}Bei Punktgleichheit legst du die Reihenfolge mit ▲▼ fest.
            </p>
          </section>
        </>
      )}
      {printDialog && (
        <PrintDialog
          id="results"
          title="Ergebnisliste drucken"
          options={[
            {
              kind: "choice",
              key: "classes",
              label: "Klassen",
              default: "all",
              choices: [
                { value: "all", label: "Alle Klassen (je Klasse eine Seite)" },
                ...Object.values(competition.classes).map((c) => ({ value: c.id, label: `Nur ${c.name}` })),
              ],
            },
            { kind: "check", key: "athletes", label: "Turner:innen mit Punkten je Durchgang", default: true },
            {
              kind: "check",
              key: "notes",
              label: "Alle Einzelnoten (E1 bis E4, HD, D, Abzüge, ab)",
              default: true,
            },
            {
              kind: "check",
              key: "judges",
              label: "Kampfgericht mit Namen (wer welche Note gegeben hat)",
              default: true,
              sub: true,
            },
            {
              kind: "check",
              key: "separators",
              label: "Trennlinien zwischen den Turner:innen",
              default: false,
            },
          ]}
          onPrint={printResults}
          onClose={() => setPrintDialog(false)}
        />
      )}
      {portal}
    </div>
  );
}

/**
 * Auswahl der Finalmannschaften: Vorschlag nach der Regel, aber frei änderbar. Mannschaften
 * lassen sich über die Finalgrenze ziehen oder mit den Pfeilen hinein- und herausnehmen.
 */
function FinalSelection({
  competition,
  classId,
  proposal,
  draft,
  setDraft,
  onMoveTie,
  onConfirm,
}: {
  competition: Competition;
  classId: ClassId;
  proposal: FinalProposal;
  draft: string[] | undefined;
  setDraft: (ids: string[] | undefined) => void;
  onMoveTie: (group: string[], teamId: string, delta: number) => void;
  onConfirm: (ids: string[]) => void;
}) {
  const config = competition.classes[classId];
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<"in" | "out" | null>(null);
  const selected = new Set(draft ?? proposal.proposedIds);
  const inFinal = proposal.standings.filter((s) => selected.has(s.teamId));
  const outside = proposal.standings.filter((s) => !selected.has(s.teamId));
  const deviates = draft !== undefined && [...selected].sort().join() !== [...proposal.proposedIds].sort().join();
  const toggle = (teamId: string, into: boolean) => {
    const next = new Set(selected);
    if (into) next.add(teamId);
    else next.delete(teamId);
    setDraft([...next]);
  };

  const zoneProps = (zone: "in" | "out") => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragging) return;
      e.preventDefault();
      setDropZone(zone);
    },
    onDragLeave: () => setDropZone((z) => (z === zone ? null : z)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragging) toggle(dragging, zone === "in");
      setDragging(null);
      setDropZone(null);
    },
  });

  const row = (s: TeamStanding, into: boolean) => {
    const team = competition.teams.find((t) => t.id === s.teamId)!;
    return (
      <li
        key={s.teamId}
        draggable
        className={dragging === s.teamId ? "draggable dragging" : "draggable"}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", s.teamId);
          setDragging(s.teamId);
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropZone(null);
        }}
      >
        <span className="drag-handle" aria-hidden>
          ⠿
        </span>
        <span className={into ? "team-rank finalist" : "team-rank"}>{s.rank}</span>
        <span className="team-order-name">
          {teamLabel(team)}
          {proposal.tiedAtCutoff.includes(s.teamId) && <span className="pill pill-warning"> punktgleich</span>}
        </span>
        <span className="num-col">{formatPoints(s.vorkampf)}</span>
        <TieButtons
          standings={proposal.standings}
          standing={s}
          points={(x) => x.vorkampf}
          onMove={(group, delta) => onMoveTie(group, s.teamId, delta)}
        />
        <button
          className="button-secondary small-button"
          onClick={() => toggle(s.teamId, !into)}
          title={into ? "Aus dem Finale nehmen" : "Ins Finale nehmen"}
        >
          {into ? "Raus" : "Ins Finale"}
        </button>
      </li>
    );
  };

  return (
    <>
      <p className="muted small">
        Vorschlag nach dem Vorkampf: die besten {proposal.count} von {proposal.standings.length} Mannschaften (2/3
        {config.finalQualification?.maxTeams ? `, höchstens ${config.finalQualification.maxTeams}` : ""}). Du kannst
        Mannschaften über die Finalgrenze ziehen oder mit „Ins Finale“ und „Raus“ verschieben.
      </p>
      <h3 className="final-zone-title">Im Finale ({inFinal.length})</h3>
      <ol className={dropZone === "in" ? "team-order drop-zone over" : "team-order drop-zone"} {...zoneProps("in")}>
        {inFinal.map((s) => row(s, true))}
        {inFinal.length === 0 && <li className="drop-empty muted small">Hierher ziehen</li>}
      </ol>
      <div className="final-divider">Finalgrenze</div>
      <ol className={dropZone === "out" ? "team-order drop-zone over" : "team-order drop-zone"} {...zoneProps("out")}>
        {outside.map((s) => row(s, false))}
        {outside.length === 0 && <li className="drop-empty muted small">Alle Mannschaften sind im Finale</li>}
      </ol>
      {deviates && (
        <p className="alert alert-warning small">
          Die Auswahl weicht vom Vorschlag nach der Regel ab.{" "}
          <button className="link" onClick={() => setDraft(undefined)}>
            Vorschlag wiederherstellen
          </button>
        </p>
      )}
      {!deviates && proposal.tiedAtCutoff.length > 0 && (
        <p className="alert alert-warning small">
          Gleichstand an der Finalgrenze. Reihenfolge der punktgleichen Mannschaften mit ▲▼ festlegen oder die
          Mannschaften direkt verschieben.
        </p>
      )}
      <div className="draw-actions">
        <button disabled={inFinal.length === 0} onClick={() => onConfirm(inFinal.map((s) => s.teamId))}>
          {inFinal.length} Finalisten bestätigen
        </button>
      </div>
    </>
  );
}

function TieButtons({
  standings,
  standing,
  points,
  onMove,
}: {
  standings: TeamStanding[];
  standing: TeamStanding;
  points: (s: TeamStanding) => number;
  onMove: (group: string[], delta: number) => void;
}) {
  const group = tieGroup(standings, standing, points);
  if (group.length < 2) return <span className="tie-buttons" />;
  const at = group.indexOf(standing.teamId);
  return (
    <span className="tie-buttons no-print">
      <button
        className="icon-button small-icon"
        aria-label="Bei Gleichstand nach vorne"
        disabled={at === 0}
        onClick={() => onMove(group, -1)}
      >
        ▲
      </button>
      <button
        className="icon-button small-icon"
        aria-label="Bei Gleichstand nach hinten"
        disabled={at === group.length - 1}
        onClick={() => onMove(group, 1)}
      >
        ▼
      </button>
    </span>
  );
}

function ResultsTable({
  competition,
  results,
  classId,
  showAthletes = false,
  showNotes = false,
  separators = false,
  onMoveTie,
}: {
  competition: Competition;
  results: TeamResult[];
  classId: ClassId;
  showAthletes?: boolean;
  /** Unter jeder Turnerin / jedem Turner alle Einzelnoten je Durchgang. */
  showNotes?: boolean;
  /** Linie zwischen den einzelnen Turner:innen, zur besseren Übersicht. */
  separators?: boolean;
  onMoveTie?: (stage: TieStage, group: string[], teamId: string, delta: number) => void;
}) {
  const config = competition.classes[classId];
  const withFinal = config.rounds.includes("finale") && competition.finals?.[classId] !== undefined;
  const rounds = withFinal ? config.rounds : VORKAMPF_ROUNDS.filter((r) => config.rounds.includes(r));
  const standings = results.map((r) => r.standing);
  const points = (s: TeamStanding) => ((s as FinalStanding).finalist ? s.total : s.vorkampf);
  const sameKind = (s: FinalStanding) => standings.filter((o) => o.finalist === s.finalist);
  const label = { pflicht: "Pflicht", kuer: "Kür", finale: "Finale" } as const;

  return (
    <table className={["table results", showAthletes && "with-athletes", showNotes && "with-notes", separators && "with-separators"].filter(Boolean).join(" ")}>
      <thead>
        <tr>
          <th className="num-col">Rang</th>
          <th>Mannschaft</th>
          {rounds.map((r) => (
            <th key={r} className="num-col">
              {label[r]}
            </th>
          ))}
          <th className="num-col">{withFinal ? "Gesamt" : "Vorkampf"}</th>
          {onMoveTie && <th aria-label="Gleichstand" />}
        </tr>
      </thead>
      {results.map(({ team, standing, athletes }) => (
        <tbody key={team.id} className={standing.finalist ? "finalist" : undefined}>
          <tr className="team-row">
            <td className="num-col">
              {standing.rank}.{standing.unresolvedTie && <span title="Punktgleich, noch nicht entschieden"> =</span>}
            </td>
            <td>
              <strong>{teamLabel(team)}</strong>
              {standing.finalist && <span className="muted small"> · Finale</span>}
            </td>
            {rounds.map((r) => (
              <td key={r} className="num-col">
                {standing.rounds[r]?.countedAthleteIds.length ? formatPoints(standing.rounds[r]!.total) : "–"}
              </td>
            ))}
            <td className="num-col">
              <strong>{formatPoints(points(standing))}</strong>
            </td>
            {onMoveTie && (
              <td>
                <TieButtons
                  standings={sameKind(standing)}
                  standing={standing}
                  points={points}
                  onMove={(group, delta) =>
                    onMoveTie(standing.finalist ? "final" : "vorkampf", group, team.id, delta)
                  }
                />
              </td>
            )}
          </tr>
          {showAthletes &&
            athletes.map(({ athlete, rounds: perRound }) => (
              <tr key={athlete.id} className="athlete-row">
                <td />
                <td>
                  {athlete.lastName}
                  {athlete.firstName && `, ${athlete.firstName}`}
                  <span className="muted small">
                    {" "}
                    {athlete.birthYear || ""} {athlete.pflichtLevel ?? ""}
                  </span>
                </td>
                {rounds.map((r) => {
                  const result = perRound[r];
                  return (
                    <td key={r} className={result?.counted ? "num-col counted" : "num-col not-counted"}>
                      {result ? (result.absent ? "n. a." : formatPoints(result.total ?? 0)) : ""}
                    </td>
                  );
                })}
                <td />
                {onMoveTie && <td />}
              </tr>
            )).flatMap((athleteRow, i) =>
              showNotes
                ? [
                    athleteRow,
                    <tr key={`${athletes[i].athlete.id}-notes`} className="notes-row">
                      <td />
                      <td colSpan={rounds.length + 2 + (onMoveTie ? 1 : 0)}>
                        <AthleteNotes
                          competition={competition}
                          athlete={athletes[i].athlete}
                          rounds={rounds}
                          withHeader={i === 0}
                        />
                      </td>
                    </tr>,
                  ]
                : [athleteRow],
            )}
        </tbody>
      ))}
    </table>
  );
}

/** Alle Noten einer Turnerin / eines Turners, eine Zeile je Durchgang. */
function AthleteNotes({
  competition,
  athlete,
  rounds,
  withHeader,
}: {
  competition: Competition;
  athlete: Athlete;
  rounds: RoundKind[];
  /** Spaltenköpfe nur bei der ersten Person einer Mannschaft. */
  withHeader: boolean;
}) {
  const { panel } = competition;
  const label = { pflicht: "Pflicht", kuer: "Kür", finale: "Finale" } as const;
  const lines = rounds.flatMap((round) => {
    const entry = getRoutine(competition, round, athlete.id);
    const state = routineState(entry, panel);
    if (!entry || state === "open") return [];
    return [{ round, entry, state, breakdown: routineBreakdown(competition, athlete, round, entry) }];
  });
  if (lines.length === 0) return null;
  const note = (v: number | null | undefined) => (typeof v === "number" ? formatPoints(v).replace(/0$/, "") : "–");
  return (
    <table className="notes-table">
      <thead className={withHeader ? undefined : "notes-head-hidden"}>
        <tr>
          <th />
          {Array.from({ length: panel.executionJudges }, (_, i) => (
            <th key={`e${i}`}>E{i + 1}</th>
          ))}
          {Array.from({ length: panel.hdJudges }, (_, i) => (
            <th key={`h${i}`}>HD{i + 1}</th>
          ))}
          <th>D</th>
          {panel.timeOfFlight && <th>ToF</th>}
          <th>Abzug</th>
          <th>ab</th>
          <th>Punkte</th>
        </tr>
      </thead>
      <tbody>
        {lines.map(({ round, entry, state, breakdown }) => {
          if (state === "absent") {
            return (
              <tr key={round}>
                <td>{label[round]}</td>
                <td colSpan={panel.executionJudges + panel.hdJudges + (panel.timeOfFlight ? 5 : 4)}>nicht angetreten</td>
              </tr>
            );
          }
          const execution = entry.execution.slice(0, panel.executionJudges);
          const dropped = execution.every((n) => typeof n === "number")
            ? droppedExecutionNotes(execution as number[])
            : [];
          const deduction = breakdown ? breakdown.pflichtDeduction + breakdown.otherDeduction : entry.otherDeduction;
          return (
            <tr key={round}>
              <td>{label[round]}</td>
              {Array.from({ length: panel.executionJudges }, (_, i) => {
                const text = `${note(execution[i])}${entry.filledExecution?.includes(i) ? "*" : ""}`;
                return <td key={`e${i}`}>{dropped.includes(i) ? `(${text})` : text}</td>;
              })}
              {Array.from({ length: panel.hdJudges }, (_, i) => (
                <td key={`h${i}`}>{note(entry.hd[i])}</td>
              ))}
              <td>{note(entry.difficulty)}</td>
              {panel.timeOfFlight && <td>{note(entry.timeOfFlight)}</td>}
              <td>{deduction ? formatPoints(deduction) : ""}</td>
              <td>{completedElementsOf(entry)}</td>
              <td>
                <strong>{breakdown ? formatPoints(breakdown.total) : "unvollständig"}</strong>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
