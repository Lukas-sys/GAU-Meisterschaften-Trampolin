import type { ClassId, Competition, Team } from "../core";
import { NumberInput } from "./NumberInput";

interface Props {
  team: Team;
  competition: Competition;
  onChange: (change: (t: Team) => Team) => void;
  autoFocusClub?: boolean;
}

/** Vorschlagsliste aller bekannten Vereine; einmal pro Seite einbinden. */
export function KnownClubs({ competition }: { competition: Competition }) {
  const clubs = [...new Set(competition.teams.map((t) => t.club.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "de"),
  );
  return (
    <datalist id="known-clubs">
      {clubs.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}

/** Verein, Mannschaftsnummer und Klasse einer Mannschaft. */
export function TeamFields({ team, competition, onChange, autoFocusClub }: Props) {
  return (
    <>
      <label className="grow">
        Verein
        <input
          value={team.club}
          placeholder="Vereinsname"
          list="known-clubs"
          autoFocus={autoFocusClub}
          onChange={(e) => onChange((t) => ({ ...t, club: e.target.value }))}
        />
      </label>
      <label className="narrow">
        Mannschaft
        <NumberInput value={team.number} onChange={(v) => v && onChange((t) => ({ ...t, number: v }))} />
      </label>
      <label className="narrow">
        Klasse
        <select
          value={team.classId}
          onChange={(e) => onChange((t) => ({ ...t, classId: e.target.value as ClassId }))}
        >
          {Object.values(competition.classes).map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
