import { useState } from "react";

const STORAGE_KEY = "gvm.lastSeenVersion";

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // ohne Speicher erscheint der Hinweis eben beim nächsten Start noch einmal
  }
}

/** Nach einem Update einmal „Aktualisiert auf Version …“ mit Link zum Changelog zeigen. */
export function UpdatedHint({ version, onShowWhatsNew }: { version: string; onShowWhatsNew: () => void }) {
  const [previous] = useState(() => {
    const seen = readLastSeen();
    if (seen === null) remember(version); // Erster Start: nichts zu melden
    return seen;
  });
  const [visible, setVisible] = useState(previous !== null && previous !== version);
  if (!visible) return null;

  const close = () => {
    remember(version);
    setVisible(false);
  };
  return (
    <div className="update-notice no-print" role="status">
      <div className="update-text">
        <strong>Aktualisiert auf Version {version}</strong>
        <span className="muted small"> (vorher {previous})</span>
      </div>
      <div className="update-actions">
        <button
          className="button-secondary"
          onClick={() => {
            close();
            onShowWhatsNew();
          }}
        >
          Was ist neu?
        </button>
        <button className="icon-button" aria-label="Schließen" onClick={close}>
          ×
        </button>
      </div>
    </div>
  );
}
