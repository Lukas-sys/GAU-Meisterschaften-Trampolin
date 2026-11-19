import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onBeamerReady, publishBeamer } from "../beamerChannel";
import { beamerView, type BeamerMode, type BeamerView, type ClassId, type Competition, type RoundKind } from "../core";

export interface BeamerSelection {
  classId: ClassId;
  round: RoundKind;
  index: number;
}

export interface BeamerControl {
  mode: BeamerMode;
  setMode: (mode: BeamerMode) => void;
  /** Der Wettkampfmodus meldet hier, welche Übung gerade angezeigt wird. */
  select: (selection: BeamerSelection) => void;
}

/**
 * Hält fest, was der Beamer zeigt, und schickt es bei jeder Änderung los. Liegt in App,
 * damit der Beamer beim Wechsel auf eine andere Seite stehen bleibt.
 */
export function useBeamer(competition: Competition | null): BeamerControl {
  const [mode, setMode] = useState<BeamerMode>("routine");
  const [selection, setSelection] = useState<BeamerSelection | null>(null);

  const view: BeamerView | null = useMemo(() => {
    if (!competition) return null;
    if (!selection) {
      return {
        mode: "pause",
        title: competition.name,
        subtitle: "",
        next: [],
        standings: { columns: [], rows: [] },
        progress: { scored: 0, total: 0 },
      };
    }
    return beamerView(competition, selection.classId, selection.round, selection.index, mode);
  }, [competition, selection, mode]);

  const latest = useRef(view);
  latest.current = view;
  useEffect(() => publishBeamer(view), [view]);
  useEffect(() => onBeamerReady(() => publishBeamer(latest.current)), []);
  // Neuer Wettkampf: alte Auswahl vergessen.
  const competitionId = competition?.id;
  useEffect(() => setSelection(null), [competitionId]);

  const select = useCallback(
    (next: BeamerSelection) =>
      setSelection((current) =>
        current && current.classId === next.classId && current.round === next.round && current.index === next.index
          ? current
          : next,
      ),
    [],
  );
  return { mode, setMode, select };
}
