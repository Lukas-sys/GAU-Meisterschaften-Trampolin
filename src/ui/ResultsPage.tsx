import { useMemo, useState } from "react";
import {
  classResults,
  classStartList,
  confirmFinalists,
  finalProposal,
  finalTeams,
  formatPoints,
  getRoutine,
  moveInTie,
  resetFinalists,
  resultsCsv,
  resultsWorkbook,
  routineState,
  teamLabel,
  VORKAMPF_ROUNDS,
  type ClassId,
  type Competition,
  type FinalStanding,
  type TeamResult,
  type TeamStanding,
  type TieStage,
} from "../core";
import { canWriteXlsx, exportTextFile, exportXlsxFile } from "../platform";
import { PrintHeader, usePrint } from "./usePrint";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
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

export function ResultsPage({ competition, update }: Props) {
  const [classId, setClassId] = useState<ClassId>("OK");
  const [showAthletes, setShowAthletes] = useState(true);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const { print, portal } = usePrint();

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

  const printResults = () =>
    print(
      <>
        {Object.values(competition.classes)
          .filter((c) => competition.teams.some((t) => t.classId === c.id))
          .map((c) => (
            <section key={c.id} className="print-page">
              <PrintHeader competition={competition} title={`${c.name} · Ergebnisliste`} />
              <ResultsTable competition={competition} results={classResults(competition, c.id)} classId={c.id} showAthletes />
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
        <div className="spacer" />
        <button className="button-secondary" onClick={printResults} disabled={competition.teams.length === 0}>
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
                        disabled={proposal.tiedAtCutoff.length > 0}
                        onClick={() => update((c) => confirmFinalists(c, classId, proposal.proposedIds))}
                      >
                        Aktuellen Stand übernehmen
                      </button>
                    </div>
                  )}
                  <button className="link" onClick={() => update((c) => resetFinalists(c, classId))}>
                    Auswahl aufheben
                  </button>
                </>
              ) : (
                <>
                  <p className="muted small">
                    Vorschlag nach dem Vorkampf: die besten {proposal.count} von {proposal.standings.length}{" "}
                    Mannschaften (2/3
                    {config.finalQualification?.maxTeams ? `, höchstens ${config.finalQualification.maxTeams}` : ""}).
                  </p>
                  <ol className="team-order">
                    {proposal.standings.map((s, i) => {
                      const team = competition.teams.find((t) => t.id === s.teamId)!;
                      const inFinal = proposal.proposedIds.includes(s.teamId);
                      return (
                        <li key={s.teamId} className={i === proposal.count ? "cutoff" : undefined}>
                          <span className={inFinal ? "team-rank finalist" : "team-rank"}>{s.rank}</span>
                          <span className="team-order-name">
                            {teamLabel(team)}
                            {proposal.tiedAtCutoff.includes(s.teamId) && (
                              <span className="pill pill-warning"> punktgleich</span>
                            )}
                          </span>
                          <span className="num-col">{formatPoints(s.vorkampf)}</span>
                          <TieButtons
                            standings={proposal.standings}
                            standing={s}
                            points={(x) => x.vorkampf}
                            onMove={(group, delta) =>
                              update((c) => moveInTie(c, classId, "vorkampf", group, s.teamId, delta))
                            }
                          />
                        </li>
                      );
                    })}
                  </ol>
                  {proposal.tiedAtCutoff.length > 0 && (
                    <p className="alert alert-warning small">
                      Gleichstand an der Finalgrenze. Bitte die Reihenfolge der punktgleichen Mannschaften mit ▲▼
                      festlegen.
                    </p>
                  )}
                  <div className="draw-actions">
                    <button
                      disabled={proposal.tiedAtCutoff.length > 0 || proposal.count === 0}
                      onClick={() => update((c) => confirmFinalists(c, classId, proposal.proposedIds))}
                    >
                      Finalisten bestätigen
                    </button>
                  </div>
                </>
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
      {portal}
    </div>
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
  onMoveTie,
}: {
  competition: Competition;
  results: TeamResult[];
  classId: ClassId;
  showAthletes?: boolean;
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
    <table className={showAthletes ? "table results with-athletes" : "table results"}>
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
            ))}
        </tbody>
      ))}
    </table>
  );
}
