export interface NumberTextOptions {
  /** Erlaubt Dezimalzahlen mit Komma oder Punkt. */
  decimal?: boolean;
  /**
   * „Ohne Komma tippen“: Eine Eingabe nur aus Ziffern zählt in Zehnteln (67 = 6,7; 100 = 10;
   * 5 = 0,5). Mit Komma oder Punkt gilt der Wert wörtlich.
   */
  tenths?: boolean;
}

/** Liest eine Zahleneingabe; undefined bei leerer oder ungültiger Eingabe. */
export function parseNumberText(text: string, { decimal = false, tenths = false }: NumberTextOptions = {}): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  if (tenths && /^\d+$/.test(trimmed)) return Number(trimmed) / 10;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || (!decimal && !tenths && !Number.isInteger(n))) return undefined;
  return n;
}

/**
 * Zahl für ein Eingabefeld, mit Komma. `minDecimals: 1` zeigt ganze Zahlen als „7,0“: So steht
 * in Notenfeldern immer ein Komma, und beim Tippen ohne Komma wird ein schon eingetragener Wert
 * nicht noch einmal durch 10 geteilt.
 */
export function formatNumberText(value: number | undefined, minDecimals = 0): string {
  if (value === undefined) return "";
  const text = String(value);
  const decimals = text.includes(".") ? text.split(".")[1].length : 0;
  return (decimals >= minDecimals ? text : value.toFixed(minDecimals)).replace(".", ",");
}
