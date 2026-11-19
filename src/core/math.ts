/** Rundet auf drei Nachkommastellen, um Gleitkomma-Reste wie 23.700000000000003 zu entfernen. */
export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
