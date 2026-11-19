import { useCallback, useEffect, useRef, useState } from "react";
import { parseCompetition, serializeCompetition, type Competition } from "../core";
import { readTextFile, rememberRecentFile, writeTextFile } from "../platform";

export type SaveState = "saved" | "pending" | "error";

const AUTOSAVE_DELAY_MS = 400;

export interface CompetitionFile {
  competition: Competition | null;
  path: string | null;
  saveState: SaveState;
  saveError: string | null;
  update: (change: (competition: Competition) => Competition) => void;
  create: (competition: Competition, path: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  /** Speichert ausstehende Änderungen sofort (z. B. vor einem Update). */
  flush: () => Promise<void>;
  /** Speichert ausstehende Änderungen und schließt den Wettkampf. */
  close: () => Promise<void>;
}

/** Hält den geöffneten Wettkampf und speichert jede Änderung automatisch in die Datei. */
export function useCompetitionFile(): CompetitionFile {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = useRef(false);
  const latest = useRef<{ competition: Competition | null; path: string | null }>({ competition, path });
  latest.current = { competition, path };

  useEffect(() => {
    if (!competition || !path || !dirty.current) return;
    setSaveState("pending");
    const timer = setTimeout(() => {
      writeTextFile(path, serializeCompetition(competition))
        .then(() => {
          dirty.current = false;
          setSaveState("saved");
          setSaveError(null);
        })
        .catch((error: unknown) => {
          setSaveState("error");
          setSaveError(String(error));
        });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [competition, path]);

  const update = useCallback((change: (c: Competition) => Competition) => {
    dirty.current = true;
    setCompetition((current) => (current ? change(current) : current));
  }, []);

  const create = useCallback(async (next: Competition, target: string) => {
    await writeTextFile(target, serializeCompetition(next));
    rememberRecentFile(target);
    dirty.current = false;
    setCompetition(next);
    setPath(target);
    setSaveState("saved");
  }, []);

  const openPath = useCallback(async (target: string) => {
    const loaded = parseCompetition(await readTextFile(target));
    rememberRecentFile(target);
    dirty.current = false;
    setCompetition(loaded);
    setPath(target);
    setSaveState("saved");
  }, []);

  const flush = useCallback(async () => {
    const { competition: current, path: target } = latest.current;
    if (dirty.current && current && target) {
      await writeTextFile(target, serializeCompetition(current));
      dirty.current = false;
      setSaveState("saved");
    }
  }, []);

  const close = useCallback(async () => {
    await flush();
    setCompetition(null);
    setPath(null);
  }, [flush]);

  return { competition, path, saveState, saveError, update, create, openPath, flush, close };
}
