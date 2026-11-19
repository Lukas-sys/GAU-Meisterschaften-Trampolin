import { useState } from "react";
import {
  applyImport,
  competitionYear,
  parseMeldebogen,
  type ClassId,
  type Competition,
  type ImportSummary,
  type ParsedMeldebogen,
} from "../core";
import { fileName, pickMeldeboegen, readSpreadsheet } from "../platform";
import { Modal } from "./Modal";

export interface PendingMeldung {
  meldung: ParsedMeldebogen;
  include: boolean;
}

/** Öffnet den Dateidialog und liest die gewählten Meldebögen ein. */
export async function loadMeldeboegen(
  competition: Competition,
): Promise<{ loaded: PendingMeldung[]; failed: string[] }> {
  const loaded: PendingMeldung[] = [];
  const failed: string[] = [];
  for (const path of await pickMeldeboegen()) {
    try {
      const meldung = parseMeldebogen(await readSpreadsheet(path), fileName(path), competitionYear(competition));
      loaded.push({ meldung, include: meldung.teams.length > 0 });
    } catch (e) {
      failed.push(`${fileName(path)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { loaded, failed };
}

interface Props {
  competition: Competition;
  initial: PendingMeldung[];
  initialErrors: string[];
  onApply: (competition: Competition, summary: ImportSummary) => void;
  onClose: () => void;
}

export function ImportDialog({ competition, initial, initialErrors, onApply, onClose }: Props) {
  const [pending, setPending] = useState(initial);
  const [errors, setErrors] = useState(initialErrors);
  const [busy, setBusy] = useState(false);

  async function addMore() {
    setBusy(true);
    const { loaded, failed } = await loadMeldeboegen(competition);
    setPending((list) => [...list, ...loaded]);
    setErrors((list) => [...list, ...failed]);
    setBusy(false);
  }

  const setEntry = (index: number, change: (p: PendingMeldung) => PendingMeldung) =>
    setPending((list) => list.map((p, i) => (i === index ? change(p) : p)));
  const edit = (index: number, change: (m: ParsedMeldebogen) => ParsedMeldebogen) =>
    setEntry(index, (p) => ({ ...p, meldung: change(p.meldung) }));

  const selected = pending.filter((p) => p.include).map((p) => p.meldung);
  const missingClass = selected.some((m) => m.teams.some((t) => t.classId === null));
  const missingClub = selected.some((m) => !m.club.trim());

  function apply() {
    const { competition: next, summary } = applyImport(competition, selected);
    onApply(next, summary);
  }

  return (
    <Modal
      title="Meldebögen importieren"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="button-secondary" onClick={() => void addMore()} disabled={busy}>
            {busy ? "Lese Dateien …" : "Weitere Meldebögen …"}
          </button>
          <div className="spacer" />
          {(missingClass || missingClub) && (
            <span className="muted small">Bitte Verein und Klasse bei allen Mannschaften angeben.</span>
          )}
          <button className="button-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button onClick={apply} disabled={selected.length === 0 || missingClass || missingClub}>
            {selected.length} {selected.length === 1 ? "Meldebogen" : "Meldebögen"} übernehmen
          </button>
        </>
      }
    >
      <p className="muted small">
        Prüfe, was erkannt wurde. Gibt es eine Mannschaft (Verein, Nummer, Klasse) schon, werden ihre
        Turner:innen ersetzt.
      </p>
      {errors.map((e) => (
        <p key={e} className="alert alert-error">
          {e}
        </p>
      ))}
      {pending.length === 0 && <p className="empty">Keine Meldebögen ausgewählt.</p>}

      {pending.map(({ meldung, include }, index) => (
        <section key={`${meldung.fileName}-${index}`} className={include ? "import-item" : "import-item excluded"}>
          <div className="import-header">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={include}
                onChange={(e) => setEntry(index, (p) => ({ ...p, include: e.target.checked }))}
              />
              <strong>{meldung.fileName}</strong>
            </label>
            <label className="grow">
              Verein
              <input
                value={meldung.club}
                placeholder="Vereinsname"
                onChange={(e) => edit(index, (m) => ({ ...m, club: e.target.value }))}
              />
            </label>
          </div>

          {meldung.warnings.length > 0 && (
            <ul className="inline-issues">
              {meldung.warnings.map((w) => (
                <li key={w} className="warning">
                  {w}
                </li>
              ))}
            </ul>
          )}

          <table className="table compact">
            <thead>
              <tr>
                <th>Mannschaft</th>
                <th>Klasse</th>
                <th>Turner:innen</th>
              </tr>
            </thead>
            <tbody>
              {meldung.teams.map((team, t) => (
                <tr key={t} className={team.classId === null ? "row-error" : ""}>
                  <td>{team.number}. Mannschaft</td>
                  <td>
                    <select
                      value={team.classId ?? ""}
                      onChange={(e) =>
                        edit(index, (m) => ({
                          ...m,
                          teams: m.teams.map((x, i) =>
                            i === t ? { ...x, classId: (e.target.value || null) as ClassId | null } : x,
                          ),
                        }))
                      }
                    >
                      <option value="">bitte wählen</option>
                      {Object.values(competition.classes).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{team.athletes.map((a) => `${a.firstName} ${a.lastName}`.trim()).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meldung.judges.length > 0 && (
            <p className="muted small">Kampfrichter:innen: {meldung.judges.join("; ")}</p>
          )}
        </section>
      ))}
    </Modal>
  );
}
