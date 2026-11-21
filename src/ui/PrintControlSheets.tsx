import { classStartList, ROUND_LABELS, teamLabel, type ClassId, type Competition, type RoundKind } from "../core";
import type { PrintOption, PrintSettings } from "./PrintDialog";
import type { PrintJob } from "./PrintStartLists";
import { PrintHeader } from "./usePrint";

const formatScore = (v: number) => String(v).replace(".", ",");

/**
 * Leere Kontrolltabelle zum Mitschreiben von Hand (Sicherung, falls der Rechner ausfällt):
 * je Klasse und Durchgang die Startreihenfolge mit leeren Kästchen für alle Noten. Querformat.
 */
export function PrintControlSheets({ competition, jobs }: { competition: Competition; jobs: PrintJob[] }) {
  const { panel } = competition;
  const execution = Array.from({ length: panel.executionJudges }, (_, i) => `E${i + 1}`);
  const hd = Array.from({ length: panel.hdJudges }, (_, i) => `HD${i + 1}`);
  const boxes = [...execution, ...hd, "D", ...(panel.timeOfFlight ? ["ToF"] : []), "Sonst.", "ab"];

  return (
    <>
      {jobs.map((job) => {
        const isPflicht = job.round === "pflicht";
        const rows = classStartList(competition, job.classId, job.round);
        return (
          <section key={`${job.classId}-${job.round}`} className="print-page control-sheet">
            <PrintHeader
              competition={competition}
              title={`${competition.classes[job.classId].name} · Kontrollblatt ${ROUND_LABELS[job.round]}`}
            />
            <table className="table control-table">
              <thead>
                <tr>
                  <th className="num-col">Nr</th>
                  <th>Name</th>
                  <th>Mannschaft</th>
                  {isPflicht && <th>Stufe</th>}
                  {isPflicht && <th className="num-col">P-Abzug</th>}
                  {boxes.map((label) => (
                    <th key={label} className="box-col">
                      {label}
                    </th>
                  ))}
                  <th className="box-col points-col">Punkte</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.athlete.id}
                    className={i > 0 && rows[i - 1].position !== row.position ? "block-start" : undefined}
                  >
                    <td className="num-col">{row.startNumber}</td>
                    <td>
                      <strong>{row.athlete.lastName}</strong>
                      {row.athlete.firstName && `, ${row.athlete.firstName}`}
                    </td>
                    <td>{teamLabel(row.team)}</td>
                    {isPflicht && <td>{row.athlete.pflichtLevel ?? "–"}</td>}
                    {isPflicht && (
                      <td className="num-col">
                        {row.pflichtDeduction === undefined ? "–" : formatScore(row.pflichtDeduction)}
                      </td>
                    )}
                    {boxes.map((label) => (
                      <td key={label} className="box-col" />
                    ))}
                    <td className="box-col points-col" />
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="print-legend">
              Sonst. = sonstiger Abzug · ab = Anzahl gewerteter Sprünge (leer = 10)
              {isPflicht && " · P-Abzug = Pflichtabzug laut Stufe"}
            </p>
          </section>
        );
      })}
    </>
  );
}

const roundKey = (round: RoundKind) => `round_${round}`;

/** Auswahl im Druckdialog: welche Durchgänge. */
export const controlSheetOptions = (rounds: RoundKind[]): PrintOption[] =>
  rounds.map((round) => ({ kind: "check", key: roundKey(round), label: ROUND_LABELS[round], default: true }));

export const controlSheetJobs = (classId: ClassId, rounds: RoundKind[], settings: PrintSettings): PrintJob[] =>
  rounds.filter((round) => settings[roundKey(round)] === true).map((round) => ({ classId, round }));
