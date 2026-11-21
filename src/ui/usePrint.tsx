import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Competition } from "../core";
import { printPage } from "../printGuard";

export interface PrintOptions {
  /** Querformat. Gilt für den ganzen Druck: Die Druckvorschau richtet sich nach der allgemeinen
   * @page-Regel, Seitenformate benannter Seiten übernimmt sie nicht. */
  landscape?: boolean;
}

/** Druckt beliebigen Inhalt: rendert ihn unsichtbar außerhalb der App und öffnet die Druckvorschau. */
export function usePrint() {
  const [job, setJob] = useState<{ content: ReactNode; id: number; options: PrintOptions } | null>(null);

  useEffect(() => {
    if (!job) return;
    // Erst nach dem Rendern der Druckansicht drucken.
    const frame = requestAnimationFrame(() => printPage());
    return () => cancelAnimationFrame(frame);
  }, [job]);

  return {
    print: (content: ReactNode, options: PrintOptions = {}) => setJob({ content, id: Date.now(), options }),
    portal: job
      ? createPortal(
          <div className="print-root">
            {job.options.landscape && <style>{LANDSCAPE_PAGE}</style>}
            {job.content}
          </div>,
          document.body,
        )
      : null,
  };
}

const LANDSCAPE_PAGE = `@media print {
  @page {
    size: A4 landscape;
    margin: 12mm 10mm;
    @bottom-right {
      content: "Seite " counter(page) " von " counter(pages);
      font-size: 8pt;
    }
  }
}`;

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
