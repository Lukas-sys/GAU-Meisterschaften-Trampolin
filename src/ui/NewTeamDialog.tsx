import { useState } from "react";
import { createAthlete, createTeam, nextTeamNumber, type Athlete, type ClassId, type Competition, type Team } from "../core";
import { AthleteTable } from "./AthleteTable";
import { Modal } from "./Modal";
import { TeamFields } from "./TeamFields";

const INITIAL_ROWS = 4;

interface Props {
  competition: Competition;
  classId: ClassId;
  onCreate: (team: Team) => void;
  onClose: () => void;
}

const isBlank = (a: Athlete) =>
  !a.lastName.trim() && !a.firstName.trim() && !a.birthYear && !a.pflichtLevel && Object.keys(a.startPositions).length === 0;

/** Dialog zum Erfassen einer neuen Mannschaft mit ihren Turner:innen. */
export function NewTeamDialog({ competition, classId, onCreate, onClose }: Props) {
  const [numberEdited, setNumberEdited] = useState(false);
  const [draft, setDraft] = useState<Team>(() =>
    createTeam({
      club: "",
      classId,
      number: nextTeamNumber(competition.teams, "", classId),
      athletes: Array.from({ length: INITIAL_ROWS }, () => createAthlete()),
    }),
  );

  function change(update: (t: Team) => Team) {
    const next = update(draft);
    const numberChangedByUser = next.number !== draft.number;
    if (numberChangedByUser) setNumberEdited(true);
    const keyChanged = next.club !== draft.club || next.classId !== draft.classId;
    setDraft(
      keyChanged && !numberEdited && !numberChangedByUser
        ? { ...next, number: nextTeamNumber(competition.teams, next.club.trim(), next.classId) }
        : next,
    );
  }

  const canCreate = draft.club.trim() !== "";

  function create() {
    onCreate({ ...draft, club: draft.club.trim(), athletes: draft.athletes.filter((a) => !isBlank(a)) });
  }

  return (
    <Modal
      title="Neue Mannschaft anlegen"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="muted small">Leere Zeilen werden nicht übernommen.</span>
          <div className="spacer" />
          <button className="button-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button onClick={create} disabled={!canCreate}>
            Mannschaft anlegen
          </button>
        </>
      }
    >
      <div className="team-header">
        <TeamFields team={draft} competition={competition} onChange={change} autoFocusClub />
      </div>
      <AthleteTable team={draft} competition={competition} issues={[]} onChange={change} />
    </Modal>
  );
}
