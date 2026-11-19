import { useMemo } from "react";
import {
  classRoundScores,
  finalStandings,
  formatPoints,
  ROUND_LABELS,
  teamLabel,
  vorkampfStandings,
  type ClassId,
  type Competition,
  type RoundKind,
} from "../core";

interface Props {
  competition: Competition;
  classId: ClassId;
  round: RoundKind;
  highlightTeamId?: string;
}

/** „–“ solange in dem Durchgang noch niemand der Mannschaft gewertet ist. */
const points = (result: { total: number; countedAthleteIds: string[] } | undefined) =>
  result && result.countedAthleteIds.length > 0 ? formatPoints(result.total) : "–";

/** Zwischenstand der Mannschaften; darunter die Einzelwertungen des aktuellen Durchgangs. */
export function LiveTable({ competition, classId, round, highlightTeamId }: Props) {
  const isFinal = round === "finale";
  // Im Finale zählt Pflicht + Kür + Finale für die Finalmannschaften, sonst der Vorkampf.
  const standings = useMemo(
    () =>
      isFinal
        ? finalStandings(competition, classId).filter((s) => s.finalist)
        : vorkampfStandings(competition, classId),
    [competition, classId, isFinal],
  );
  const scores = useMemo(() => classRoundScores(competition, classId), [competition, classId]);
  const teams = new Map(competition.teams.map((t) => [t.id, t]));
  const config = competition.classes[classId];
  const hasKuer = config.rounds.includes("kuer");

  return (
    <section className="card live-table" aria-label="Zwischenstand">
      <h2>Zwischenstand</h2>
      <p className="muted small">
        Beste {config.countingScores} je Durchgang zählen (fett). Darunter: {ROUND_LABELS[round]}.
      </p>
      <table className="table compact">
        <thead>
          <tr>
            <th className="num-col">Rang</th>
            <th>Mannschaft</th>
            <th className="num-col">Pflicht</th>
            {hasKuer && <th className="num-col">Kür</th>}
            {isFinal && <th className="num-col">Finale</th>}
            <th className="num-col">{isFinal ? "Gesamt" : "Vorkampf"}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const team = teams.get(s.teamId)!;
            const roundResult = s.rounds[round];
            const roundScores = scores.get(round);
            const athletes = team.athletes
              .filter((a) => roundScores?.has(a.id))
              .map((a) => ({ athlete: a, score: roundScores!.get(a.id)! }))
              .sort((x, y) => y.score - x.score);
            return (
              <tr key={s.teamId} className={s.teamId === highlightTeamId ? "highlight" : undefined}>
                <td className="num-col">
                  {s.rank}
                  {s.unresolvedTie && <span title="Punktgleich"> =</span>}
                </td>
                <td>
                  {teamLabel(team)}
                  {athletes.length > 0 && (
                    <div className="live-scores">
                      {athletes.map(({ athlete, score }) => (
                        <span
                          key={athlete.id}
                          className={roundResult?.countedAthleteIds.includes(athlete.id) ? "counted" : "not-counted"}
                          title={`${athlete.firstName} ${athlete.lastName}`}
                        >
                          {formatPoints(score)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="num-col">{points(s.rounds.pflicht)}</td>
                {hasKuer && <td className="num-col">{points(s.rounds.kuer)}</td>}
                {isFinal && <td className="num-col">{points(s.rounds.finale)}</td>}
                <td className="num-col">
                  <strong>{formatPoints(isFinal ? s.total : s.vorkampf)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
