import { athletePflichtDeduction, formatPoints, ROUND_LABELS, teamLabel, type Competition, type Team } from "../core";
import type { PrintOption, PrintSettings } from "./PrintDialog";
import { PrintHeader } from "./usePrint";

/** Einstellungen für den Druck der Meldungen. `currentClassId` ist die gerade gewählte Klasse. */
export function teamPrintOptions(competition: Competition, currentClassId: string): PrintOption[] {
  const current = competition.classes[currentClassId as keyof typeof competition.classes];
  return [
    {
      kind: "choice",
      key: "teams",
      label: "Mannschaften",
      default: "class",
      choices: [
        { value: "class", label: `Alle der ${current.name}` },
        { value: "all", label: "Alle Mannschaften (alle Klassen)" },
        ...competition.teams
          .filter((t) => t.classId === currentClassId)
          .map((t) => ({ value: `team:${t.id}`, label: `Nur ${teamLabel(t)}` })),
      ],
    },
    {
      kind: "choice",
      key: "layout",
      label: "Aufteilung",
      default: "1",
      choices: [
        { value: "1", label: "Eine Mannschaft pro Seite" },
        { value: "2", label: "Zwei Mannschaften pro Seite" },
        { value: "list", label: "Alle hintereinander" },
      ],
    },
    { kind: "check", key: "birthYear", label: "Jahrgang", default: true },
    { kind: "check", key: "pflicht", label: "Pflichtstufe und Pflichtabzug", default: true },
    { kind: "check", key: "positions", label: "Startplätze je Durchgang", default: true },
    { kind: "check", key: "signature", label: "Zeile für Unterschrift", default: false },
  ];
}

export function selectTeams(competition: Competition, currentClassId: string, settings: PrintSettings): Team[] {
  const choice = String(settings.teams);
  if (choice === "all") {
    const classOrder = Object.keys(competition.classes);
    return [...competition.teams].sort((a, b) => classOrder.indexOf(a.classId) - classOrder.indexOf(b.classId));
  }
  if (choice.startsWith("team:")) return competition.teams.filter((t) => t.id === choice.slice(5));
  return competition.teams.filter((t) => t.classId === currentClassId);
}

/** Druckseiten der Meldungen: je Mannschaft eine Tabelle, aufgeteilt nach Wahl. */
export function PrintTeams({
  competition,
  teams,
  settings,
}: {
  competition: Competition;
  teams: Team[];
  settings: PrintSettings;
}) {
  const perPage = settings.layout === "list" ? teams.length : Number(settings.layout);
  const pages: Team[][] = [];
  for (let i = 0; i < teams.length; i += Math.max(perPage, 1)) pages.push(teams.slice(i, i + Math.max(perPage, 1)));

  return (
    <>
      {pages.map((page, p) => (
        <section key={p} className={`print-page print-teams per-page-${settings.layout}`}>
          <PrintHeader competition={competition} title="Meldungen" />
          {page.map((team) => (
            <TeamBlock key={team.id} competition={competition} team={team} settings={settings} />
          ))}
        </section>
      ))}
    </>
  );
}

function TeamBlock({ competition, team, settings }: { competition: Competition; team: Team; settings: PrintSettings }) {
  const config = competition.classes[team.classId];
  const rounds = settings.positions ? config.rounds : [];
  return (
    <div className="print-team">
      <h2>
        {teamLabel(team)} <span className="print-team-class">· {config.name}</span>
      </h2>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Vorname</th>
            {settings.birthYear && <th className="num-col">Jg</th>}
            {settings.pflicht && <th>Pflicht</th>}
            {settings.pflicht && <th className="num-col">Abzug</th>}
            {rounds.map((r) => (
              <th key={r} className="num-col">
                SP {ROUND_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.athletes.map((a) => {
            const deduction = athletePflichtDeduction(a, competition);
            return (
              <tr key={a.id}>
                <td>
                  <strong>{a.lastName}</strong>
                </td>
                <td>{a.firstName}</td>
                {settings.birthYear && <td className="num-col">{a.birthYear || "–"}</td>}
                {settings.pflicht && <td>{a.pflichtLevel ?? "–"}</td>}
                {settings.pflicht && (
                  <td className="num-col">{deduction ? formatPoints(deduction) : deduction === 0 ? "0" : "–"}</td>
                )}
                {rounds.map((r) => (
                  <td key={r} className="num-col">
                    {a.startPositions[r] ?? "–"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {settings.signature && (
        <div className="print-signature">
          <span>Datum, Unterschrift Verein</span>
        </div>
      )}
    </div>
  );
}
