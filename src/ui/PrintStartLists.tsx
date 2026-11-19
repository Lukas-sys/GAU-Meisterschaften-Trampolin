import { classStartList, ROUND_LABELS, type ClassId, type Competition, type RoundKind } from "../core";
import { StartListTable } from "./StartListTable";
import { PrintHeader } from "./usePrint";

export interface PrintJob {
  classId: ClassId;
  round: RoundKind;
}

/** Druckseiten der Startlisten, je Klasse und Durchgang eine A4-Seite. */
export function PrintStartLists({ competition, jobs }: { competition: Competition; jobs: PrintJob[] }) {
  return (
    <>
      {jobs.map((job) => (
        <section key={`${job.classId}-${job.round}`} className="print-page">
          <PrintHeader
            competition={competition}
            title={`${competition.classes[job.classId].name} · Startreihenfolge ${ROUND_LABELS[job.round]}`}
          />
          <StartListTable rows={classStartList(competition, job.classId, job.round)} round={job.round} />
        </section>
      ))}
    </>
  );
}
