import { teamLabel, type RoundKind, type StartListRow } from "../core";

const formatScore = (v: number) => String(v).replace(".", ",");

/** Startliste wie in der Excel: Nr, Name, Jahrgang, (Pflicht, Abzug), Verein. Blöcke je Startplatz. */
export function StartListTable({ rows, round }: { rows: StartListRow[]; round: RoundKind }) {
  const isPflicht = round === "pflicht";
  return (
    <table className="table startlist">
      <thead>
        <tr>
          <th className="num-col">Nr</th>
          <th>Name</th>
          <th className="num-col">Jg</th>
          {isPflicht && <th>Pflicht</th>}
          {isPflicht && <th className="num-col">Abzug</th>}
          <th>Verein</th>
          <th className="num-col" title="Startplatz in der Mannschaft">
            SP
          </th>
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
            <td className="num-col">{row.athlete.birthYear || "–"}</td>
            {isPflicht && <td>{row.athlete.pflichtLevel ?? "–"}</td>}
            {isPflicht && (
              <td className={row.pflichtDeduction ? "num-col has-deduction" : "num-col muted-cell"}>
                {row.pflichtDeduction === undefined ? "–" : formatScore(row.pflichtDeduction)}
              </td>
            )}
            <td>{teamLabel(row.team)}</td>
            <td className="num-col">{row.position}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
