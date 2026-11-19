import { teamLabel, type RoundKind, type StartListRow } from "../core";

const formatScore = (v: number) => String(v).replace(".", ",");

/** Welche Spalten die Startliste zeigt; fehlende Angaben heißen „anzeigen“. */
export interface StartListColumns {
  birthYear?: boolean;
  pflicht?: boolean;
  club?: boolean;
  position?: boolean;
  /** Leere Spalte zum Mitschreiben der Punkte. */
  scoreColumn?: boolean;
}

/** Startliste wie in der Excel: Nr, Name, Jahrgang, (Pflicht, Abzug), Verein. Blöcke je Startplatz. */
export function StartListTable({
  rows,
  round,
  columns = {},
}: {
  rows: StartListRow[];
  round: RoundKind;
  columns?: StartListColumns;
}) {
  const show = { birthYear: true, pflicht: true, club: true, position: true, scoreColumn: false, ...columns };
  const isPflicht = round === "pflicht" && show.pflicht;
  return (
    <table className="table startlist">
      <thead>
        <tr>
          <th className="num-col">Nr</th>
          <th>Name</th>
          {show.birthYear && <th className="num-col">Jg</th>}
          {isPflicht && <th>Pflicht</th>}
          {isPflicht && <th className="num-col">Abzug</th>}
          {show.club && <th>Verein</th>}
          {show.position && (
            <th className="num-col" title="Startplatz in der Mannschaft">
              SP
            </th>
          )}
          {show.scoreColumn && <th className="score-col">Punkte</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.athlete.id} className={i > 0 && rows[i - 1].position !== row.position ? "block-start" : ""}>
            <td className="num-col">{row.startNumber}</td>
            <td>
              <strong>{row.athlete.lastName}</strong>
              {row.athlete.firstName && `, ${row.athlete.firstName}`}
            </td>
            {show.birthYear && <td className="num-col">{row.athlete.birthYear || "–"}</td>}
            {isPflicht && <td>{row.athlete.pflichtLevel ?? "–"}</td>}
            {isPflicht && (
              <td className={row.pflichtDeduction ? "num-col has-deduction" : "num-col muted-cell"}>
                {row.pflichtDeduction === undefined ? "–" : formatScore(row.pflichtDeduction)}
              </td>
            )}
            {show.club && <td>{teamLabel(row.team)}</td>}
            {show.position && <td className="num-col">{row.position}</td>}
            {show.scoreColumn && <td className="score-col" />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
