import { useState } from "react";
import type { Competition, Issue, Team } from "../core";
import { AthleteTable } from "./AthleteTable";
import { TeamFields } from "./TeamFields";

interface Props {
  team: Team;
  competition: Competition;
  issues: Issue[];
  onChange: (change: (t: Team) => Team) => void;
  onRemove: () => void;
}

export function TeamCard({ team, competition, issues, onChange, onRemove }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const teamIssues = issues.filter((i) => !i.athleteId);

  return (
    <section className="card team-card">
      <div className="team-header">
        <TeamFields team={team} competition={competition} onChange={onChange} />
        <div className="spacer" />
        {confirmRemove ? (
          <div className="confirm">
            <span>Mannschaft löschen?</span>
            <button className="button-danger" onClick={onRemove}>
              Löschen
            </button>
            <button className="button-secondary" onClick={() => setConfirmRemove(false)}>
              Abbrechen
            </button>
          </div>
        ) : (
          <button className="button-secondary" onClick={() => setConfirmRemove(true)}>
            Mannschaft löschen
          </button>
        )}
      </div>

      {teamIssues.length > 0 && (
        <ul className="inline-issues">
          {teamIssues.map((i, n) => (
            <li key={n} className={i.severity}>
              {i.message}
            </li>
          ))}
        </ul>
      )}

      <AthleteTable team={team} competition={competition} issues={issues} onChange={onChange} />
    </section>
  );
}
