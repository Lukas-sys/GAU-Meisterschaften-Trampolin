/**
 * Updates über GitHub Releases (tauri-plugin-updater). Nur im Desktop-Programm;
 * im Browser und ohne Internet gibt es einfach kein Update.
 */
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type { Update };

export async function checkForUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  try {
    return await check({ timeout: 15_000 });
  } catch (error) {
    // Kein Internet, GitHub nicht erreichbar oder noch kein Release: kein Grund zur Meldung.
    console.warn("Update-Prüfung fehlgeschlagen:", error);
    return null;
  }
}

export interface DownloadProgress {
  downloaded: number;
  total?: number;
}

/** Lädt das Update, installiert es und startet das Programm neu. */
export async function installUpdate(update: Update, onProgress: (p: DownloadProgress) => void): Promise<void> {
  let downloaded = 0;
  let total: number | undefined;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") total = event.data.contentLength;
    if (event.event === "Progress") downloaded += event.data.chunkLength;
    onProgress({ downloaded, total });
  });
  // Unter Windows beendet der Installer das Programm meist schon selbst.
  await relaunch();
}
