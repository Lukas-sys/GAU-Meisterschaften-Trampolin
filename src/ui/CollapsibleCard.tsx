import { useState, type ReactNode } from "react";

interface Props {
  /** Schlüssel, unter dem der Zustand (auf/zu) gemerkt wird. */
  id: string;
  title: string;
  /** Kurzfassung, die im Kopf steht, damit man auch eingeklappt das Wichtigste sieht. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

const storageKey = (id: string) => `gvm.collapsed.${id}`;

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(storageKey(id));
    return stored === null ? fallback : stored === "open";
  } catch {
    return fallback;
  }
}

/** Karte mit Kopfzeile zum Ein- und Ausklappen; Kopf und Inhalt bilden einen Rahmen. */
export function CollapsibleCard({ id, title, summary, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));

  function toggle() {
    setOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(storageKey(id), next ? "open" : "closed");
      } catch {
        // Ohne Speicher bleibt der Zustand nur bis zum Neuladen erhalten.
      }
      return next;
    });
  }

  return (
    <section className={open ? "card collapsible open" : "card collapsible"}>
      <button className="collapsible-header" aria-expanded={open} onClick={toggle}>
        <span className="chevron">{open ? "▾" : "▸"}</span>
        <h2>{title}</h2>
        {summary && <span className="muted small collapsible-summary">{summary}</span>}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}
