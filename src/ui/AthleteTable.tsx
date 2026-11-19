import {
  competitionYear,
  createAthlete,
  PFLICHT_LEVELS,
  pflichtDeduction,
  ROUND_LABELS,
  type Athlete,
  type Competition,
  type Issue,
  type PflichtLevel,
  type RoundKind,
  type Team,
} from "../core";
import { NumberInput } from "./NumberInput";

interface Props {
  team: Team;
  competition: Competition;
  issues: Issue[];
  onChange: (change: (t: Team) => Team) => void;
}

/** Tabelle der Turner:innen einer Mannschaft, direkt bearbeitbar. */
export function AthleteTable({ team, competition, issues, onChange }: Props) {
  const config = competition.classes[team.classId];
  const rounds = config.rounds;
  const year = competitionYear(competition);

  const setAthlete = (id: string, change: Partial<Athlete>) =>
    onChange((t) => ({ ...t, athletes: t.athletes.map((a) => (a.id === id ? { ...a, ...change } : a)) }));

  const setPosition = (athlete: Athlete, round: RoundKind, value: number | undefined) => {
    const startPositions = { ...athlete.startPositions };
    if (value === undefined || value === 0) delete startPositions[round];
    else startPositions[round] = value;
    setAthlete(athlete.id, { startPositions });
  };

  return (
    <>
      <table className="table athletes">
        <thead>
          <tr>
            <th>Name</th>
            <th>Vorname</th>
            <th>Jg</th>
            <th>Pflicht</th>
            <th title="Pflichtabzug, automatisch aus Jahrgang und Pflichtstufe berechnet">Abzug</th>
            {rounds.map((r) => (
              <th key={r} title={`Startplatz ${ROUND_LABELS[r]}`}>
                SP {ROUND_LABELS[r]}
              </th>
            ))}
            <th aria-label="Aktionen" />
          </tr>
        </thead>
        <tbody>
          {team.athletes.map((athlete) => {
            const problems = issues.filter((i) => i.athleteId === athlete.id);
            const computed =
              athlete.pflichtLevel && athlete.birthYear
                ? pflichtDeduction(athlete.birthYear, athlete.pflichtLevel, year, competition.pflichtTable)
                : undefined;
            const rowClass = problems.some((p) => p.severity === "error")
              ? "row-error"
              : problems.length > 0
                ? "row-warning"
                : "";
            return (
              <tr key={athlete.id} className={rowClass} title={problems.map((p) => p.message).join("\n") || undefined}>
                <td>
                  <input
                    aria-label="Name"
                    placeholder="Name"
                    value={athlete.lastName}
                    onChange={(e) => setAthlete(athlete.id, { lastName: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label="Vorname"
                    placeholder="Vorname"
                    value={athlete.firstName}
                    onChange={(e) => setAthlete(athlete.id, { firstName: e.target.value })}
                  />
                </td>
                <td>
                  <NumberInput
                    ariaLabel="Jahrgang"
                    className="num year"
                    placeholder="Jg"
                    value={athlete.birthYear || undefined}
                    onChange={(v) => setAthlete(athlete.id, { birthYear: v ?? 0 })}
                  />
                </td>
                <td>
                  <select
                    aria-label="Pflichtstufe"
                    value={athlete.pflichtLevel ?? ""}
                    onChange={(e) =>
                      setAthlete(athlete.id, { pflichtLevel: (e.target.value || null) as PflichtLevel | null })
                    }
                  >
                    <option value="">–</option>
                    {PFLICHT_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <DeductionCell
                    computed={computed}
                    override={athlete.pflichtDeductionOverride}
                    onChange={(v) => setAthlete(athlete.id, { pflichtDeductionOverride: v })}
                  />
                </td>
                {rounds.map((r) => (
                  <td key={r}>
                    <NumberInput
                      ariaLabel={`Startplatz ${ROUND_LABELS[r]}`}
                      value={athlete.startPositions[r]}
                      placeholder="–"
                      onChange={(v) => setPosition(athlete, r, v)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="icon-button"
                    aria-label="Turner:in entfernen"
                    onClick={() => onChange((t) => ({ ...t, athletes: t.athletes.filter((a) => a.id !== athlete.id) }))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="team-footer">
        <button
          className="button-secondary"
          disabled={team.athletes.length >= config.maxTeamSize}
          onClick={() => onChange((t) => ({ ...t, athletes: [...t.athletes, createAthlete()] }))}
        >
          + Turner:in
        </button>
        <span className="muted small">
          {team.athletes.length} von {config.maxTeamSize} · SP = Startplatz, leer = startet nicht
        </span>
      </div>
    </>
  );
}

const formatScore = (v: number) => String(v).replace(".", ",");

/**
 * Pflichtabzug: zeigt den berechneten Wert. Nur auf ausdrücklichen Wunsch wird
 * er von Hand überschrieben; der berechnete Wert lässt sich jederzeit wiederherstellen.
 */
function DeductionCell({
  computed,
  override,
  onChange,
}: {
  computed: number | undefined;
  override: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  if (override === undefined) {
    return (
      <span className="deduction">
        <span className={computed ? "deduction-value has-deduction" : "deduction-value"} aria-label="Pflichtabzug">
          {computed === undefined ? "–" : formatScore(computed)}
        </span>
        <button
          className="icon-button small-icon"
          title="Abzug von Hand anpassen"
          aria-label="Abzug von Hand anpassen"
          onClick={() => onChange(computed ?? 0)}
        >
          ✎
        </button>
      </span>
    );
  }
  return (
    <span className="deduction">
      <NumberInput decimal ariaLabel="Pflichtabzug (von Hand)" className="num override" value={override} onChange={onChange} />
      <button
        className="icon-button small-icon"
        title={`Berechneten Wert verwenden (${computed === undefined ? "–" : formatScore(computed)})`}
        aria-label="Berechneten Wert verwenden"
        onClick={() => onChange(undefined)}
      >
        ↺
      </button>
    </span>
  );
}
