import { useEffect, useMemo, useState } from "react";
import {
  appendMissingTeams,
  classStartList,
  classTeamOrder,
  drawClass,
  moveTeam,
  ROUND_LABELS,
  teamLabel,
  validateCompetition,
  type ClassId,
  type Competition,
  type RoundKind,
} from "../core";
import { controlSheetJobs, controlSheetOptions, PrintControlSheets } from "./PrintControlSheets";
import { PrintDialog } from "./PrintDialog";
import { PrintStartLists, START_LIST_PRINT_OPTIONS, startListColumns, type PrintJob } from "./PrintStartLists";
import { StartListTable } from "./StartListTable";
import { usePrint } from "./usePrint";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
  /** Gewählte Klasse, gilt für alle Seiten (Umschalter in der Reiterleiste). */
  classId: ClassId;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

/** Durchgänge mit Startliste; die Finalliste gibt es erst, wenn die Finalisten bestätigt sind. */
export const availableRounds = (competition: Competition, classId: ClassId): RoundKind[] =>
  competition.classes[classId].rounds.filter((r) => r !== "finale" || competition.finals?.[classId] !== undefined);

export function StartListsPage({ competition, update, classId }: Props) {
  const [selectedRound, setRound] = useState<RoundKind>("pflicht");
  const [confirmDraw, setConfirmDraw] = useState(false);
  useEffect(() => setConfirmDraw(false), [classId]);
  const { print: printContent, portal } = usePrint();
  const rounds = availableRounds(competition, classId);
  const round = rounds.includes(selectedRound) ? selectedRound : rounds[0];

  const config = competition.classes[classId];
  const { ordered, missing, order } = classTeamOrder(competition, classId);
  const rows = classStartList(competition, classId, round);
  const finalPending = config.rounds.includes("finale") && !competition.finals?.[classId];
  const classErrors = useMemo(() => {
    const ids = new Set(competition.teams.filter((t) => t.classId === classId).map((t) => t.id));
    return validateCompetition(competition).filter((i) => i.severity === "error" && i.teamId && ids.has(i.teamId));
  }, [competition, classId]);

  const [printJobs, setPrintJobs] = useState<PrintJob[] | null>(null);
  const [printingControl, setPrintingControl] = useState(false);
  const print = (jobs: PrintJob[]) => setPrintJobs(jobs);

  function draw() {
    update((c) => drawClass(c, classId));
    setConfirmDraw(false);
  }

  function printAll() {
    const jobs = Object.values(competition.classes).flatMap((c) =>
      classTeamOrder(competition, c.id).ordered.length === 0
        ? []
        : availableRounds(competition, c.id).map((r) => ({ classId: c.id, round: r })),
    );
    print(jobs);
  }

  const teamCount = ordered.length + missing.length;
  const anyOrdered = Object.values(competition.classes).some((c) => classTeamOrder(competition, c.id).ordered.length > 0);
  const undrawnClasses = Object.values(competition.classes).filter((c) => {
    const state = classTeamOrder(competition, c.id);
    return state.ordered.length === 0 && state.missing.length > 0;
  });

  return (
    <div className="stack">
      <div className="toolbar no-print">
        <div className="spacer" />
        {anyOrdered && undrawnClasses.length > 0 && (
          <span className="muted small">
            {undrawnClasses.map((c) => c.name).join(", ")} noch nicht gelost, wird nicht mitgedruckt
          </span>
        )}
        <button className="button-secondary" onClick={printAll} disabled={!anyOrdered}>
          Alle Startlisten drucken
        </button>
      </div>

      {classErrors.length > 0 && (
        <p className="alert alert-error no-print">
          In den Meldungen der {config.name} gibt es {classErrors.length} Fehler (siehe „Meldungen“). Die Startlisten
          können dadurch unvollständig sein.
        </p>
      )}

      <div className="startlists-layout no-print">
        <section className="card">
          <h2>Mannschaftsreihenfolge</h2>
          <p className="muted small">
            {order?.drawnAt
              ? `Gelost am ${formatDateTime(order.drawnAt)}${order.editedByHand ? ", danach von Hand angepasst" : ""}.`
              : order
                ? "Von Hand festgelegt."
                : "Noch nicht gelost."}{" "}
            Gilt für Pflicht und Kür.
          </p>

          {teamCount === 0 ? (
            <p className="empty">Keine Mannschaften in der {config.name}.</p>
          ) : (
            <>
              {ordered.length > 0 && (
                <ol className="team-order">
                  {ordered.map((team, i) => (
                    <li key={team.id}>
                      <span className="team-rank">{i + 1}</span>
                      <span className="team-order-name">
                        {teamLabel(team)}
                        <span className="muted small nowrap"> · {team.athletes.length} Turner:innen</span>
                      </span>
                      <button
                        className="icon-button small-icon"
                        aria-label={`${teamLabel(team)} nach oben`}
                        disabled={i === 0}
                        onClick={() => update((c) => moveTeam(c, classId, team.id, -1))}
                      >
                        ▲
                      </button>
                      <button
                        className="icon-button small-icon"
                        aria-label={`${teamLabel(team)} nach unten`}
                        disabled={i === ordered.length - 1}
                        onClick={() => update((c) => moveTeam(c, classId, team.id, 1))}
                      >
                        ▼
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {missing.length > 0 && order && (
                <div className="alert alert-warning small">
                  <p className="tight">
                    Noch nicht in der Reihenfolge: {missing.map(teamLabel).join(", ")}. Hinten anfügen oder neu
                    auslosen.
                  </p>
                  <button className="button-secondary" onClick={() => update((c) => appendMissingTeams(c, classId))}>
                    Hinten anfügen
                  </button>
                </div>
              )}

              <div className="draw-actions">
                {confirmDraw ? (
                  <div className="confirm">
                    <span>Bisherige Reihenfolge verwerfen?</span>
                    <button className="button-danger" onClick={draw}>
                      Neu auslosen
                    </button>
                    <button className="button-secondary" onClick={() => setConfirmDraw(false)}>
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button onClick={() => (order ? setConfirmDraw(true) : draw())}>
                    {order ? "Neu auslosen" : "Auslosen"}
                  </button>
                )}
                {!order && (
                  <button className="button-secondary" onClick={() => update((c) => appendMissingTeams(c, classId))}>
                    Ohne Losen übernehmen
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-title-row">
            <h2>Startliste</h2>
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
            <div className="spacer" />
            <button
              className="button-secondary"
              disabled={rows.length === 0}
              onClick={() => print([{ classId, round }])}
            >
              Drucken
            </button>
            <button
              className="button-secondary"
              disabled={ordered.length === 0}
              onClick={() => setPrintingControl(true)}
              title="Leere Tabelle zum Mitschreiben der Noten von Hand"
            >
              Kontrollblatt drucken
            </button>
          </div>
          {ordered.length === 0 ? (
            <p className="empty">Die Startliste entsteht, sobald die Mannschaftsreihenfolge feststeht.</p>
          ) : rows.length === 0 ? (
            <p className="empty">In diesem Durchgang hat niemand einen Startplatz.</p>
          ) : (
            <StartListTable rows={rows} round={round} />
          )}
          {finalPending && (
            <p className="muted small">
              Die Startliste fürs Finale erscheint, sobald die Finalisten unter „Ergebnisse“ bestätigt sind:
              schwächste Finalmannschaft zuerst.
            </p>
          )}
        </section>
      </div>

      {printJobs && (
        <PrintDialog
          id="startlists"
          title={printJobs.length > 1 ? "Alle Startlisten drucken" : "Startliste drucken"}
          options={START_LIST_PRINT_OPTIONS}
          onClose={() => setPrintJobs(null)}
          onPrint={(settings) =>
            printContent(<PrintStartLists competition={competition} jobs={printJobs} columns={startListColumns(settings)} />)
          }
        />
      )}
      {printingControl && (
        <PrintDialog
          id="controlsheet"
          title={`Kontrollblatt ${config.name} drucken`}
          options={controlSheetOptions(rounds)}
          onClose={() => setPrintingControl(false)}
          onPrint={(settings) => {
            const jobs = controlSheetJobs(classId, rounds, settings);
            if (jobs.length > 0)
              printContent(
                <PrintControlSheets competition={competition} jobs={jobs} showJudges={settings.judges === true} />,
                { landscape: true },
              );
          }}
        />
      )}
      {portal}
    </div>
  );
}
