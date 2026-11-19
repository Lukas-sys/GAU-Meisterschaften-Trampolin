/**
 * Verbindung zwischen Hauptfenster und Beamer-Fenster. Im Desktop-Programm über
 * Tauri-Events, im Browser (Entwicklung) über einen BroadcastChannel.
 */
import { isTauri } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { BeamerView } from "./core";

export const BEAMER_LABEL = "beamer";
const STATE_EVENT = "beamer:state";
const READY_EVENT = "beamer:ready";
const CHANNEL = "gvm-beamer";

type Message = { type: "state"; view: BeamerView | null } | { type: "ready" };

let channel: BroadcastChannel | null = null;
const browserChannel = () => (channel ??= new BroadcastChannel(CHANNEL));

/** Hauptfenster: aktuellen Inhalt an den Beamer schicken (null = kein Wettkampf offen). */
export function publishBeamer(view: BeamerView | null): void {
  if (isTauri()) void emit(STATE_EVENT, view).catch(() => {});
  else browserChannel().postMessage({ type: "state", view } satisfies Message);
}

/** Hauptfenster: Bescheid bekommen, wenn ein Beamer-Fenster (neu) geladen ist. */
export function onBeamerReady(callback: () => void): () => void {
  if (isTauri()) {
    const unlisten = listen(READY_EVENT, callback);
    return () => void unlisten.then((stop) => stop());
  }
  const handler = (event: MessageEvent<Message>) => event.data.type === "ready" && callback();
  browserChannel().addEventListener("message", handler);
  return () => browserChannel().removeEventListener("message", handler);
}

/** Beamer-Fenster: Inhalte empfangen und einmal den aktuellen Stand anfordern. */
export function subscribeBeamer(callback: (view: BeamerView | null) => void): () => void {
  if (isTauri()) {
    const unlisten = listen<BeamerView | null>(STATE_EVENT, (event) => callback(event.payload));
    void unlisten.then(() => emit(READY_EVENT));
    return () => void unlisten.then((stop) => stop());
  }
  const handler = (event: MessageEvent<Message>) => event.data.type === "state" && callback(event.data.view);
  browserChannel().addEventListener("message", handler);
  browserChannel().postMessage({ type: "ready" } satisfies Message);
  return () => browserChannel().removeEventListener("message", handler);
}

/** Öffnet das Beamer-Fenster oder holt es nach vorne, falls es schon offen ist. */
export async function openBeamerWindow(): Promise<void> {
  if (!isTauri()) {
    window.open(`${location.pathname}#beamer`, BEAMER_LABEL, "width=1280,height=720");
    return;
  }
  const existing = await WebviewWindow.getByLabel(BEAMER_LABEL);
  if (existing) {
    await existing.setFocus();
    return;
  }
  const beamer = new WebviewWindow(BEAMER_LABEL, {
    url: "index.html#beamer",
    title: "GVM Trampolin – Beamer",
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
  });
  await new Promise<void>((resolve, reject) => {
    void beamer.once("tauri://created", () => resolve());
    void beamer.once("tauri://error", (event) => reject(new Error(String(event.payload))));
  });
}

/** Beamer-Fenster: Vollbild an/aus (F11 oder Doppelklick). */
export async function toggleFullscreen(): Promise<void> {
  if (isTauri()) {
    const win = getCurrentWindow();
    await win.setFullscreen(!(await win.isFullscreen()));
    return;
  }
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

export const isBeamerWindow = (): boolean => location.hash === "#beamer";
