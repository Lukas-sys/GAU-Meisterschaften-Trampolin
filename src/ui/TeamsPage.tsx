import { useMemo, useState } from "react";
import { validateCompetition, type ClassId, type Competition, type Issue, type Team } from "../core";
import { canImportSpreadsheets } from "../platform";
import { ImportDialog, loadMeldeboegen, type PendingMeldung } from "./ImportDialog";
import { IssueList } from "./IssueList";
import { NewTeamDialog } from "./NewTeamDialog";
import { PrintDialog } from "./PrintDialog";
import { PrintTeams, selectTeams, teamPrintOptions } from "./PrintTeams";
import { usePrint } from "./usePrint";
import { TeamCard } from "./TeamCard";
import { KnownClubs } from "./TeamFields";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
}

interface ClubGroup {
  key: string;
  club: string;
  teams: Team[];
}

const clubKey = (club: string) => club.trim().toLowerCase();

/** Mannschaften nach Verein gruppiert, in der Reihenfolge ihres ersten Auftretens. */
function groupByClub(teams: Team[]): ClubGroup[] {
  const groups = new Map<string, ClubGroup>();
  for (const team of teams) {
    const key = clubKey(team.club);
    if (!groups.has(key)) groups.set(key, { key, club: team.club.trim(), teams: [] });
    groups.get(key)!.teams.push(team);
  }
  return [...groups.values()];
}

export function TeamsPage({ competition, update }: Props) {
  const [classId, setClassId] = useState<ClassId>("OK");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState<{ loaded: PendingMeldung[]; failed: string[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const { print, portal } = usePrint();

  const issues = useMemo(() => validateCompetition(competition), [competition]);
  const teams = competition.teams.filter((t) => t.classId === classId);
  const groups = groupByClub(teams);
  const teamIssues = (teamIds: string[]) => issues.filter((i) => i.teamId && teamIds.includes(i.teamId));
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));

  const updateTeam = (teamId: string, change: (t: Team) => Team) =>
    update((c) => ({ ...c, teams: c.teams.map((t) => (t.id === teamId ? change(t) : t)) }));

  function toggle(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function createTeam(team: Team) {
    update((c) => ({ ...c, teams: [team, ...c.teams] }));
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(clubKey(team.club));
      return next;
    });
    setClassId(team.classId);
    setCreating(false);
    setNotice(null);
  }

  async function startImport() {
    setNotice(null);
    const result = await loadMeldeboegen(competition);
    if (result.loaded.length > 0 || result.failed.length > 0) setImporting(result);
  }

  return (
    <div className="stack">
      <KnownClubs competition={competition} />
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Klasse">
          {Object.values(competition.classes).map((config) => {
            const count = competition.teams.filter((t) => t.classId === config.id).length;
            return (
              <button
                key={config.id}
                role="tab"
                aria-selected={config.id === classId}
                className={config.id === classId ? "active" : ""}
                onClick={() => setClassId(config.id)}
              >
                {config.name} ({count})
              </button>
            );
          })}
        </div>
        <button onClick={() => setCreating(true)}>Neue Mannschaft anlegen</button>
        <div className="spacer" />
        {groups.length > 0 && (
          <button
            className="button-secondary"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)))}
          >
            {allCollapsed ? "Alle ausklappen" : "Alle einklappen"}
          </button>
        )}
        <button className="button-secondary" onClick={() => setPrinting(true)} disabled={competition.teams.length === 0}>
          Drucken
        </button>
        <button
          className="button-secondary"
          onClick={() => void startImport()}
          disabled={!canImportSpreadsheets()}
          title={canImportSpreadsheets() ? undefined : "Nur im Desktop-Programm verfügbar"}
        >
          Meldebögen importieren
        </button>
      </div>

      {notice && <p className="alert alert-success">{notice}</p>}
      <IssueList issues={teamIssues(teams.map((t) => t.id))} />

      {teams.length === 0 && (
        <p className="empty">
          Noch keine Mannschaften in der {competition.classes[classId].name}. Lege eine an oder importiere
          Meldebögen.
        </p>
      )}

      {groups.map((group) => {
        const open = !collapsed.has(group.key);
        const groupIssues = teamIssues(group.teams.map((t) => t.id));
        const errors = groupIssues.filter((i: Issue) => i.severity === "error").length;
        const warnings = groupIssues.length - errors;
        const athletes = group.teams.reduce((sum, t) => sum + t.athletes.length, 0);
        return (
          <section key={group.key} className={open ? "club-group open" : "club-group"}>
            <button className="club-header" aria-expanded={open} onClick={() => toggle(group.key)}>
              <span className="chevron">{open ? "▾" : "▸"}</span>
              <strong>{group.club || "Ohne Verein"}</strong>
              <span className="muted small">
                {group.teams.length} {group.teams.length === 1 ? "Mannschaft" : "Mannschaften"} · {athletes}{" "}
                Turner:innen
              </span>
              <span className="spacer" />
              {errors > 0 && <span className="pill pill-error">{errors} Fehler</span>}
              {warnings > 0 && (
                <span className="pill pill-warning">
                  {warnings} {warnings === 1 ? "Hinweis" : "Hinweise"}
                </span>
              )}
            </button>
            {open && (
              <div className="club-body">
                {group.teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    competition={competition}
                    issues={issues.filter((i) => i.teamId === team.id)}
                    onChange={(change) => updateTeam(team.id, change)}
                    onRemove={() => update((c) => ({ ...c, teams: c.teams.filter((t) => t.id !== team.id) }))}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {creating && (
        <NewTeamDialog
          competition={competition}
          classId={classId}
          onCreate={createTeam}
          onClose={() => setCreating(false)}
        />
      )}
      {importing && (
        <ImportDialog
          competition={competition}
          initial={importing.loaded}
          initialErrors={importing.failed}
          onClose={() => setImporting(null)}
          onApply={(next, summary) => {
            update(() => next);
            setImporting(null);
            setNotice(`Import: ${summary.added} Mannschaften neu angelegt, ${summary.replaced} ersetzt.`);
          }}
        />
      )}
      {printing && (
        <PrintDialog
          id="teams"
          title="Meldungen drucken"
          options={teamPrintOptions(competition, classId)}
          onClose={() => setPrinting(false)}
          onPrint={(settings) =>
            print(
              <PrintTeams
                competition={competition}
                teams={selectTeams(competition, classId, settings)}
                settings={settings}
              />,
            )
          }
        />
      )}
      {portal}
    </div>
  );
}
