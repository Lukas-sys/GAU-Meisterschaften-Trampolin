import {
  competitionYear,
  PFLICHT_DEDUCTION_TABLE_2026,
  PFLICHT_LEVELS,
  pflichtDeduction,
  type Competition,
  type PflichtDeductionTable,
  type PflichtLevel,
} from "../core";
import { CollapsibleCard } from "./CollapsibleCard";
import { NumberInput } from "./NumberInput";

interface Props {
  competition: Competition;
  update: (change: (c: Competition) => Competition) => void;
}

/** Stufen, die in der Ausschreibung als Spalten stehen; ab M6 gibt es nie Abzug. */
const PREVIEW_LEVELS = PFLICHT_LEVELS.slice(0, PFLICHT_LEVELS.indexOf("M6") + 1).reverse();
const format = (v: number) => (v === 0 ? "0" : String(v).replace(".", ","));

export function DeductionTableEditor({ competition, update }: Props) {
  const table = competition.pflichtTable;
  const year = competitionYear(competition);
  const requirements = table.requirements;

  const setTable = (change: Partial<PflichtDeductionTable>) =>
    update((c) => ({ ...c, pflichtTable: { ...c.pflichtTable, ...change } }));

  const setRequirement = (index: number, change: Partial<PflichtDeductionTable["requirements"][number]>) =>
    setTable({ requirements: requirements.map((r, i) => (i === index ? { ...r, ...change } : r)) });

  const isDefault = JSON.stringify(table) === JSON.stringify(PFLICHT_DEDUCTION_TABLE_2026);
  const oldestAge = Math.max(...requirements.map((r) => r.minAge), 0);
  const previewAges = Array.from({ length: oldestAge - 7 }, (_, i) => 8 + i).filter((a) => a >= 0);

  return (
    <CollapsibleCard
      id="overview.deduction"
      title="Pflichtabzug"
      defaultOpen={false}
      summary={`${format(table.stepDeduction)} je fehlender Stufe, höchstens ${format(table.maxDeduction)} · ${isDefault ? "Ausschreibung 2026" : "angepasst"}`}
    >
      <p className="muted small">
        Der Abzug richtet sich nach dem Alter im Wettkampfjahr ({year}). Die Jahrgänge verschieben sich deshalb
        jedes Jahr von selbst. Anpassen musst du die Tabelle nur, wenn sich die Regeln in der Ausschreibung ändern.
      </p>

      <div className="deduction-editor">
        <div>
          <h3>Mindest-Pflichtstufe nach Alter</h3>
          <table className="table compact">
            <thead>
              <tr>
                <th>ab Alter</th>
                <th>Jahrgang</th>
                <th>mindestens</th>
                <th aria-label="Aktionen" />
              </tr>
            </thead>
            <tbody>
              {requirements.map((r, i) => (
                <tr key={i}>
                  <td>
                    <NumberInput
                      ariaLabel="ab Alter"
                      value={r.minAge}
                      onChange={(v) => v !== undefined && setRequirement(i, { minAge: v })}
                    />
                  </td>
                  <td className="muted">{r.minAge === 0 ? "alle jüngeren" : `${year - r.minAge} und älter`}</td>
                  <td>
                    <select
                      aria-label="Mindest-Pflichtstufe"
                      value={r.requiredLevel}
                      onChange={(e) => setRequirement(i, { requiredLevel: e.target.value as PflichtLevel })}
                    >
                      {PFLICHT_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label="Zeile entfernen"
                      disabled={requirements.length <= 1}
                      onClick={() => setTable({ requirements: requirements.filter((_, j) => j !== i) })}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="inline-form">
            <button
              className="button-secondary"
              onClick={() =>
                setTable({
                  requirements: [...requirements, { minAge: oldestAge + 1, requiredLevel: requirements.at(-1)?.requiredLevel ?? "P3" }],
                })
              }
            >
              + Zeile
            </button>
          </div>
          <div className="form-grid compact-grid">
            <label>
              Abzug je fehlender Stufe
              <NumberInput decimal value={table.stepDeduction} onChange={(v) => v !== undefined && setTable({ stepDeduction: v })} />
            </label>
            <label>
              Höchstabzug
              <NumberInput decimal value={table.maxDeduction} onChange={(v) => v !== undefined && setTable({ maxDeduction: v })} />
            </label>
          </div>
          <button
            className="link"
            onClick={() => update((c) => ({ ...c, pflichtTable: structuredClone(PFLICHT_DEDUCTION_TABLE_2026) }))}
          >
            Werte der Ausschreibung 2026 wiederherstellen
          </button>
        </div>

        <div>
          <h3>Ergebnis wie in der Ausschreibung</h3>
          <table className="table compact deduction-preview">
            <thead>
              <tr>
                <th>Jahrgang</th>
                {PREVIEW_LEVELS.map((l) => (
                  <th key={l}>{l === "M6" ? "M6+" : l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewAges.map((age) => (
                <tr key={age}>
                  <td>
                    {age === 8 ? `${year - age} und jünger` : age === oldestAge ? `${year - age} und älter` : year - age}
                  </td>
                  {PREVIEW_LEVELS.map((l) => {
                    const v = pflichtDeduction(year - age, l, year, table);
                    return (
                      <td key={l} className={v > 0 ? "has-deduction" : "muted"}>
                        {format(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleCard>
  );
}
