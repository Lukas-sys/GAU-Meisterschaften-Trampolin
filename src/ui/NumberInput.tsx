import { useEffect, useState } from "react";

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Erlaubt Dezimalzahlen mit Komma oder Punkt. */
  decimal?: boolean;
}

/**
 * Zahlenfeld, das leere Eingaben erlaubt und Zwischenstände wie „1,“ nicht
 * sofort wegformatiert. Gemeldet wird nur ein gültiger Wert oder undefined.
 */
export function NumberInput({ value, onChange, placeholder, ariaLabel, className, decimal }: Props) {
  const format = (v: number | undefined) => (v === undefined ? "" : String(v).replace(".", ","));
  const [draft, setDraft] = useState(format(value));

  useEffect(() => {
    setDraft((current) => (parse(current) === value ? current : format(value)));
  }, [value]);

  function parse(text: string): number | undefined {
    const normalized = text.trim().replace(",", ".");
    if (normalized === "") return undefined;
    const n = Number(normalized);
    if (!Number.isFinite(n) || (!decimal && !Number.isInteger(n))) return undefined;
    return n;
  }

  return (
    <input
      className={className ?? "num"}
      inputMode={decimal ? "decimal" : "numeric"}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parse(e.target.value);
        if (parsed !== undefined || e.target.value.trim() === "") onChange(parsed);
      }}
      onBlur={() => setDraft(format(parse(draft) ?? value))}
    />
  );
}
