/**
 * Zugriff auf Dateien und Dialoge. Im Desktop-Programm über Tauri, im
 * Browser (nur Entwicklung) über localStorage; der Excel-Import braucht die Desktop-Hülle.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { SheetGrid, WorkbookSpec } from "./core";

export const COMPETITION_EXTENSION = "gvm";
const BROWSER_PREFIX = "browser:";

export const canImportSpreadsheets = (): boolean => isTauri();

export async function pickCompetitionToOpen(): Promise<string | null> {
  if (!isTauri()) return null;
  const path = await open({
    multiple: false,
    filters: [{ name: "Wettkampfdatei", extensions: [COMPETITION_EXTENSION] }],
  });
  return typeof path === "string" ? path : null;
}

export async function pickCompetitionSavePath(suggestedName: string): Promise<string | null> {
  const fileName = `${suggestedName.replace(/[\\/:*?"<>|]/g, "").trim() || "Wettkampf"}.${COMPETITION_EXTENSION}`;
  if (!isTauri()) return `${BROWSER_PREFIX}${fileName}`;
  return save({
    defaultPath: fileName,
    filters: [{ name: "Wettkampfdatei", extensions: [COMPETITION_EXTENSION] }],
  });
}

export async function pickMeldeboegen(): Promise<string[]> {
  const paths = await open({
    multiple: true,
    filters: [{ name: "Meldebogen", extensions: ["xls", "xlsx", "ods"] }],
  });
  if (paths === null) return [];
  return Array.isArray(paths) ? paths : [paths];
}

export async function readTextFile(path: string): Promise<string> {
  if (path.startsWith(BROWSER_PREFIX)) {
    const text = localStorage.getItem(path);
    if (text === null) throw new Error("Datei nicht gefunden.");
    return text;
  }
  return invoke<string>("read_text_file", { path });
}

/** Inhalt einer Datei mit Fingerabdruck; im Browser gibt es keinen Fingerabdruck. */
export interface VersionedText {
  contents: string;
  fingerprint: string | null;
}

export async function readTextFileVersioned(path: string): Promise<VersionedText> {
  if (path.startsWith(BROWSER_PREFIX)) return { contents: await readTextFile(path), fingerprint: null };
  return invoke<VersionedText>("read_text_file_versioned", { path });
}

/** Die Datei wurde außerhalb dieses Fensters geändert; es wurde nicht gespeichert. */
export class SaveConflictError extends Error {}

/** Die Datei ist schon in einem anderen Fenster (oder auf einem anderen Rechner) geöffnet. */
export class FileLockedError extends Error {}

const CONFLICT_PREFIX = "CONFLICT:";
const LOCKED_PREFIX = "LOCKED:";

/**
 * Speichert eine Datei. Mit `expected` (Fingerabdruck vom letzten Laden/Speichern) nur dann,
 * wenn sie seitdem niemand verändert hat, sonst SaveConflictError. Gibt den neuen Fingerabdruck zurück.
 */
export async function writeTextFile(path: string, contents: string, expected?: string | null): Promise<string | null> {
  if (path.startsWith(BROWSER_PREFIX)) {
    localStorage.setItem(path, contents);
    return null;
  }
  try {
    return await invoke<string>("write_text_file", { path, contents, expected: expected ?? null });
  } catch (error) {
    const message = String(error);
    if (message.startsWith(CONFLICT_PREFIX)) throw new SaveConflictError(message.slice(CONFLICT_PREFIX.length));
    throw error;
  }
}

/** Text der Meldung, wenn die Datei woanders geöffnet ist; `owner` ist das JSON aus der Sperrdatei. */
export function lockedMessage(owner: { host?: string; since?: number }): string {
  const details = [
    owner.host ? `Rechner ${owner.host}` : null,
    owner.since
      ? `seit ${new Date(owner.since).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
      : null,
  ].filter(Boolean);
  return `Diese Datei ist bereits in einem anderen Fenster geöffnet${details.length > 0 ? ` (${details.join(", ")})` : ""}.`;
}

/**
 * Sperrt die Wettkampfdatei für dieses Fenster, damit sie kein zweites Fenster gleichzeitig
 * öffnet. Ist sie woanders geöffnet: FileLockedError. Im Browser ohne Wirkung.
 */
export async function lockFile(path: string): Promise<void> {
  if (path.startsWith(BROWSER_PREFIX)) return;
  try {
    await invoke("lock_file", { path });
  } catch (error) {
    const message = String(error);
    if (!message.startsWith(LOCKED_PREFIX)) throw error;
    let owner: { host?: string; since?: number } = {};
    try {
      owner = JSON.parse(message.slice(LOCKED_PREFIX.length));
    } catch {
      // Ohne Angaben zum anderen Fenster.
    }
    throw new FileLockedError(lockedMessage(owner));
  }
}

export async function unlockFile(path: string): Promise<void> {
  if (path.startsWith(BROWSER_PREFIX)) return;
  await invoke("unlock_file", { path });
}

/**
 * Speichert einen Export über den Speichern-Dialog. Im Browser wird die Datei heruntergeladen.
 * Gibt den gewählten Pfad zurück, oder null bei Abbruch.
 */
export async function exportTextFile(
  suggestedName: string,
  extension: string,
  filterName: string,
  contents: string,
): Promise<string | null> {
  const fileName = `${suggestedName.replace(/[\\/:*?"<>|]/g, "").trim() || "Export"}.${extension}`;
  if (!isTauri()) {
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return fileName;
  }
  const path = await save({ defaultPath: fileName, filters: [{ name: filterName, extensions: [extension] }] });
  if (!path) return null;
  await invoke("write_text_file", { path, contents });
  return path;
}

/** Kann eine echte Excel-Datei schreiben (nur im Desktop-Programm). */
export const canWriteXlsx = (): boolean => isTauri();

/** Speichert eine Excel-Datei über den Speichern-Dialog. Gibt den Pfad zurück, oder null bei Abbruch. */
export async function exportXlsxFile(suggestedName: string, workbook: WorkbookSpec): Promise<string | null> {
  const fileName = `${suggestedName.replace(/[\\/:*?"<>|]/g, "").trim() || "Export"}.xlsx`;
  const path = await save({ defaultPath: fileName, filters: [{ name: "Excel-Datei", extensions: ["xlsx"] }] });
  if (!path) return null;
  await invoke("write_xlsx", { path, workbook });
  return path;
}

export function readSpreadsheet(path: string): Promise<SheetGrid[]> {
  return invoke<SheetGrid[]>("read_spreadsheet", { path });
}

export function fileName(path: string): string {
  return path.replace(BROWSER_PREFIX, "").split(/[\\/]/).pop() ?? path;
}

const RECENT_KEY = "gvm.recentFiles";

export function loadRecentFiles(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecentFile(path: string): void {
  try {
    const next = [path, ...loadRecentFiles().filter((p) => p !== path)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Liste der zuletzt geöffneten Dateien ist nur eine Bequemlichkeit.
  }
}

export function forgetRecentFile(path: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(loadRecentFiles().filter((p) => p !== path)));
  } catch {
    // siehe oben
  }
}
