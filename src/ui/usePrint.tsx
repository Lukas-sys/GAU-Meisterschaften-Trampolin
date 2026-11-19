import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Competition } from "../core";
import { printPage } from "../printGuard";

/** Druckt beliebigen Inhalt: rendert ihn unsichtbar außerhalb der App und öffnet die Druckvorschau. */
export function usePrint() {
  const [job, setJob] = useState<{ content: ReactNode; id: number } | null>(null);

  useEffect(() => {
    if (!job) return;
    // Erst nach dem Rendern der Druckansicht drucken.
    const frame = requestAnimationFrame(() => printPage());
    return () => cancelAnimationFrame(frame);
  }, [job]);

  return {
    print: (content: ReactNode) => setJob({ content, id: Date.now() }),
    portal: job ? createPortal(<div className="print-root">{job.content}</div>, document.body) : null,
  };
}

/** Kopf jeder Druckseite: Wettkampf, Ort und Datum, Titel. */
export function PrintHeader({ competition, title }: { competition: Competition; title: string }) {
  const date = competition.date ? new Date(competition.date).toLocaleDateString("de-DE") : "";
  return (
    <header className="print-header">
      <div>
        <strong>{competition.name}</strong>
        <span>{[competition.location, date].filter(Boolean).join(", ")}</span>
      </div>
      <h1>{title}</h1>
    </header>
  );
}
