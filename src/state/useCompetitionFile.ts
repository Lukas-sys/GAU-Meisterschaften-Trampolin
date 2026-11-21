import { useCallback, useEffect, useRef, useState } from "react";
import { parseCompetition, serializeCompetition, type Competition } from "../core";
import {
  lockFile,
  readTextFileVersioned,
  rememberRecentFile,
  SaveConflictError,
  unlockFile,
  writeTextFile,
} from "../platform";

/** "conflict": Die Datei wurde außerhalb dieses Fensters geändert; es wird nicht mehr automatisch gespeichert. */
export type SaveState = "saved" | "pending" | "error" | "conflict";

const AUTOSAVE_DELAY_MS = 400;

const CONFLICT_MESSAGE =
  "Die Datei wurde außerhalb dieses Fensters geändert. Bitte zuerst den Stand als neue Datei speichern oder die Datei neu laden.";

export interface CompetitionFile {
  competition: Competition | null;
  path: string | null;
  saveState: SaveState;
  saveError: string | null;
  update: (change: (competition: Competition) => Competition) => void;
  create: (competition: Competition, path: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  /** Speichert ausstehende Änderungen sofort (z. B. vor einem Update). Im Konfliktfall: Fehler. */
  flush: () => Promise<void>;
  /** Speichert ausstehende Änderungen und schließt den Wettkampf. Im Konfliktfall gehen sie verloren. */
  close: () => Promise<void>;
  /** Speichert den aktuellen Stand unter einem neuen Pfad und arbeitet dort weiter. */
  saveAs: (path: string) => Promise<void>;
  /** Lädt die Datei neu; eigene, nicht gespeicherte Änderungen werden verworfen. */
  reload: () => Promise<void>;
}

/**
 * Hält den geöffneten Wettkampf und speichert jede Änderung automatisch in die Datei.
 * Die Datei bleibt gesperrt, solange sie offen ist. Vor jedem Speichern wird geprüft, ob sie
 * seit dem letzten Laden/Speichern unverändert ist; sonst wird nicht überschrieben.
 */
export function useCompetitionFile(): CompetitionFile {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Zählt Änderungen; gespeichert ist, wenn `savedRevision` gleich `revision` ist. */
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const fingerprint = useRef<string | null>(null);
  const conflict = useRef(false);
  /** Speichervorgänge laufen nacheinander, damit jeder den Fingerabdruck des vorigen kennt. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef<{ competition: Competition | null; path: string | null }>({ competition, path });
  latest.current = { competition, path };

  const markConflict = useCallback(() => {
    conflict.current = true;
    setSaveState("conflict");
    setSaveError(null);
  }, []);

  /** Schreibt den Stand `rev` in die Datei, nach allen vorher angestoßenen Speichervorgängen. */
  const write = useCallback(
    (target: string, current: Competition, rev: number): Promise<void> => {
      const run = queue.current.then(async () => {
        if (conflict.current || latest.current.path !== target) return;
        if (savedRevision.current >= rev) return;
        try {
          fingerprint.current = await writeTextFile(target, serializeCompetition(current), fingerprint.current);
        } catch (error) {
          if (error instanceof SaveConflictError) markConflict();
          throw error;
        }
        savedRevision.current = rev;
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [markConflict],
  );

  useEffect(() => {
    if (!competition || !path || revision.current === savedRevision.current || conflict.current) return;
    setSaveState("pending");
    const rev = revision.current;
    const timer = setTimeout(() => {
      write(path, competition, rev)
        .then(() => {
          if (conflict.current) return;
          if (savedRevision.current === revision.current) setSaveState("saved");
          setSaveError(null);
        })
        .catch((error: unknown) => {
          if (error instanceof SaveConflictError) return;
          setSaveState("error");
          setSaveError(String(error));
        });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [competition, path, write]);

  const update = useCallback((change: (c: Competition) => Competition) => {
    revision.current += 1;
    setCompetition((current) => (current ? change(current) : current));
  }, []);

  /** Übernimmt einen frisch geladenen oder gespeicherten Stand als „gespeichert“. */
  const adopt = useCallback((next: Competition, target: string, print: string | null) => {
    revision.current += 1;
    savedRevision.current = revision.current;
    fingerprint.current = print;
    conflict.current = false;
    setCompetition(next);
    setPath(target);
    setSaveState("saved");
    setSaveError(null);
  }, []);

  const create = useCallback(
    async (next: Competition, target: string) => {
      await lockFile(target);
      try {
        const print = await writeTextFile(target, serializeCompetition(next));
        rememberRecentFile(target);
        adopt(next, target, print);
      } catch (error) {
        await unlockFile(target);
        throw error;
      }
    },
    [adopt],
  );

  const openPath = useCallback(
    async (target: string) => {
      await lockFile(target);
      try {
        const { contents, fingerprint: print } = await readTextFileVersioned(target);
        const loaded = parseCompetition(contents);
        rememberRecentFile(target);
        adopt(loaded, target, print);
      } catch (error) {
        await unlockFile(target);
        throw error;
      }
    },
    [adopt],
  );

  const flush = useCallback(async () => {
    if (conflict.current) throw new Error(CONFLICT_MESSAGE);
    const { competition: current, path: target } = latest.current;
    if (current && target && revision.current !== savedRevision.current) {
      await write(target, current, revision.current);
      setSaveState("saved");
    }
  }, [write]);

  const close = useCallback(async () => {
    if (!conflict.current) await flush();
    const target = latest.current.path;
    if (target) await unlockFile(target).catch(() => undefined);
    conflict.current = false;
    fingerprint.current = null;
    setCompetition(null);
    setPath(null);
    setSaveState("saved");
    setSaveError(null);
  }, [flush]);

  const saveAs = useCallback(
    async (target: string) => {
      const { competition: current, path: previous } = latest.current;
      if (!current) return;
      if (target === previous) throw new Error("Bitte einen anderen Dateinamen wählen.");
      await lockFile(target);
      try {
        // Laufende Speichervorgänge der alten Datei abwarten.
        await queue.current;
        const print = await writeTextFile(target, serializeCompetition(current));
        if (previous) await unlockFile(previous).catch(() => undefined);
        rememberRecentFile(target);
        adopt(current, target, print);
      } catch (error) {
        await unlockFile(target);
        throw error;
      }
    },
    [adopt],
  );

  const reload = useCallback(async () => {
    const target = latest.current.path;
    if (!target) return;
    await queue.current;
    const { contents, fingerprint: print } = await readTextFileVersioned(target);
    adopt(parseCompetition(contents), target, print);
  }, [adopt]);

  return { competition, path, saveState, saveError, update, create, openPath, flush, close, saveAs, reload };
}
