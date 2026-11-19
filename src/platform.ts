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

export async function writeTextFile(path: string, contents: string): Promise<void> {
  if (path.startsWith(BROWSER_PREFIX)) {
    localStorage.setItem(path, contents);
    return;
  }
  await invoke("write_text_file", { path, contents });
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
