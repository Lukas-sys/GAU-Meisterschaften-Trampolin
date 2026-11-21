import { useState } from "react";
import { Modal } from "./Modal";

/** Eine Einstellung im Druckdialog: Haken oder Auswahl aus mehreren Möglichkeiten. */
export type PrintOption =
  | {
      kind: "check";
      key: string;
      label: string;
      default: boolean;
      /** Unteroption: eingerückt, nur wählbar und wirksam, wenn der Haken `parent` gesetzt ist. */
      parent?: string;
    }
  | { kind: "choice"; key: string; label: string; default: string; choices: { value: string; label: string }[] };

export type PrintSettings = Record<string, string | boolean>;

const storageKey = (id: string) => `gvm.print.${id}`;

/** Unteroptionen gelten nur, wenn ihr übergeordneter Haken gesetzt ist. */
function effective(options: PrintOption[], settings: PrintSettings): PrintSettings {
  const result = { ...settings };
  for (const o of options) {
    if (o.kind === "check" && o.parent && settings[o.parent] !== true) result[o.key] = false;
  }
  return result;
}

function loadSettings(id: string, options: PrintOption[]): PrintSettings {
  const defaults = Object.fromEntries(options.map((o) => [o.key, o.default]));
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(id)) ?? "{}") as PrintSettings;
    for (const o of options) {
      const value = saved[o.key];
      if (o.kind === "check" && typeof value === "boolean") defaults[o.key] = value;
      if (o.kind === "choice" && o.choices.some((c) => c.value === value)) defaults[o.key] = value as string;
    }
  } catch {
    // Ohne gespeicherte Einstellungen gelten die Vorgaben.
  }
  return defaults;
}

/**
 * Dialog vor dem Drucken: welche Angaben auf das Blatt kommen. Die letzte Auswahl wird je
 * Druck gemerkt.
 */
export function PrintDialog({
  id,
  title,
  options,
  onPrint,
  onClose,
}: {
  id: string;
  title: string;
  options: PrintOption[];
  onPrint: (settings: PrintSettings) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(() => loadSettings(id, options));
  const set = (key: string, value: string | boolean) => setSettings((s) => ({ ...s, [key]: value }));

  function print() {
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(settings));
    } catch {
      // Merken ist nur Komfort.
    }
    onClose();
    onPrint(effective(options, settings));
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="button-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button autoFocus onClick={print}>
            Drucken
          </button>
        </>
      }
    >
      <div className="print-options">
        {options.map((o) =>
          o.kind === "check" ? (
            <label key={o.key} className={o.parent ? "checkbox print-suboption" : "checkbox"}>
              <input
                type="checkbox"
                checked={settings[o.key] === true}
                disabled={o.parent !== undefined && settings[o.parent] !== true}
                onChange={(e) => set(o.key, e.target.checked)}
              />
              {o.label}
            </label>
          ) : (
            <label key={o.key} className="print-choice">
              <span>{o.label}</span>
              <select value={String(settings[o.key])} onChange={(e) => set(o.key, e.target.value)}>
                {o.choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ),
        )}
      </div>
    </Modal>
  );
}
