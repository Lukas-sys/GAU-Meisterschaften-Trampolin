import type { PrintOption, PrintSettings } from "./PrintDialog";
import { classStartList, ROUND_LABELS, type ClassId, type Competition, type RoundKind } from "../core";
import { StartListTable, type StartListColumns } from "./StartListTable";
import { PrintHeader } from "./usePrint";

export interface PrintJob {
  classId: ClassId;
  round: RoundKind;
}

/** Druckseiten der Startlisten, je Klasse und Durchgang eine A4-Seite. */
export function PrintStartLists({
  competition,
  jobs,
  columns,
}: {
  competition: Competition;
  jobs: PrintJob[];
  columns?: StartListColumns;
}) {
  return (
    <>
      {jobs.map((job) => (
        <section key={`${job.classId}-${job.round}`} className="print-page">
          <PrintHeader
            competition={competition}
            title={`${competition.classes[job.classId].name} · Startreihenfolge ${ROUND_LABELS[job.round]}`}
          />
          <StartListTable rows={classStartList(competition, job.classId, job.round)} round={job.round} columns={columns} />
        </section>
      ))}
    </>
  );
}

export const START_LIST_PRINT_OPTIONS: PrintOption[] = [
  { kind: "check", key: "birthYear", label: "Jahrgang", default: true },
  { kind: "check", key: "pflicht", label: "Pflichtstufe und Pflichtabzug (nur Pflicht)", default: true },
  { kind: "check", key: "club", label: "Verein / Mannschaft", default: true },
  { kind: "check", key: "position", label: "Startplatz in der Mannschaft", default: true },
  { kind: "check", key: "scoreColumn", label: "Leere Spalte für Punkte", default: false },
];

export const startListColumns = (settings: PrintSettings): StartListColumns => ({
  birthYear: settings.birthYear === true,
  pflicht: settings.pflicht === true,
  club: settings.club === true,
  position: settings.position === true,
  scoreColumn: settings.scoreColumn === true,
});
