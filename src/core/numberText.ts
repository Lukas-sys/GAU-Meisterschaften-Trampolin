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

/** Zahl für ein Eingabefeld, mit Komma. */
export const formatNumberText = (value: number | undefined): string =>
  value === undefined ? "" : String(value).replace(".", ",");
