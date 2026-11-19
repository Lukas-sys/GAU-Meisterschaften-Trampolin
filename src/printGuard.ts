import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Schutz vor versehentlichem Beenden beim Drucken: Die Druckvorschau füllt das ganze
 * Fenster, und wer sie wegklicken will, trifft leicht das X des Programmfensters.
 * Solange die Vorschau offen ist (und kurz danach) wird das Schließen ignoriert.
 */
const GRACE_MS = 1500;
let printing = false;
let lastPrintEnd = 0;

window.addEventListener("beforeprint", () => {
  printing = true;
});
window.addEventListener("afterprint", () => {
  printing = false;
  lastPrintEnd = Date.now();
});

export function isPrinting(): boolean {
  return printing || Date.now() - lastPrintEnd < GRACE_MS;
}

export function printPage(): void {
  window.print();
  // Blockiert print() bis zum Schließen der Vorschau, kommt ein dabei geklicktes X erst
  // jetzt an; die Schonfrist fängt es ab. Sonst halten before-/afterprint den Zustand.
  lastPrintEnd = Date.now();
}

export async function installCloseGuard(): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    return await getCurrentWindow().onCloseRequested((event) => {
      if (isPrinting()) event.preventDefault();
    });
  } catch (error) {
    console.warn("Schutz beim Drucken nicht aktiv.", error);
    return () => {};
  }
}
