import { useEffect, useState } from "react";
import { formatNumberText as format, parseNumberText } from "../core";

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Erlaubt Dezimalzahlen mit Komma oder Punkt. */
  decimal?: boolean;
  /** „Ohne Komma tippen“: reine Ziffern zählen in Zehnteln (67 = 6,7). */
  tenths?: boolean;
}

/**
 * Zahlenfeld, das leere Eingaben erlaubt und Zwischenstände wie „1,“ nicht
 * sofort wegformatiert. Gemeldet wird nur ein gültiger Wert oder undefined.
 * Beim Tippen bleibt der eingegebene Text stehen, beim Verlassen wird er formatiert.
 */
export function NumberInput({ value, onChange, placeholder, ariaLabel, className, decimal, tenths }: Props) {
  const [draft, setDraft] = useState(format(value));
  const parse = (text: string) => parseNumberText(text, { decimal, tenths });

  useEffect(() => {
    setDraft((current) => (parse(current) === value ? current : format(value)));
  }, [value, tenths]);

  return (
    <input
      className={className ?? "num"}
      inputMode={decimal || tenths ? "decimal" : "numeric"}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parse(e.target.value);
        if (parsed !== undefined || e.target.value.trim() === "") onChange(parsed);
      }}
      onBlur={(e) => {
        // Öffnet sich ein Dialog (z. B. eine Warnung), bleibt der getippte Text stehen,
        // damit man danach einfach weitertippen kann.
        if (e.relatedTarget instanceof Element && e.relatedTarget.closest("dialog")) return;
        setDraft(format(parse(draft) ?? value));
      }}
    />
  );
}
