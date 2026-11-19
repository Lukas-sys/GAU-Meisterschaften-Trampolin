import changelog from "../../CHANGELOG.md?raw";
import { changelogSections } from "../core";
import { Markdown } from "./Markdown";
import { Modal } from "./Modal";

/** Changelog dieser Version und der früheren (aus CHANGELOG.md, beim Bauen eingebunden). */
export function WhatsNewDialog({ version, onClose }: { version: string; onClose: () => void }) {
  const sections = changelogSections(changelog).filter((s) => s.body);
  const current = sections.findIndex((s) => s.version === version);
  // Unveröffentlichtes nur in Entwicklungsversionen zeigen, deren Version noch keinen Abschnitt hat
  const shown = current >= 0 ? sections.slice(current) : sections;
  return (
    <Modal title="Was ist neu" onClose={onClose} wide>
      {shown.length === 0 && <p className="muted">Kein Changelog vorhanden.</p>}
      {shown.map((s) => (
        <section key={s.title} className="changelog-section">
          <h3>{s.version ? `Version ${s.title.replace(/[[\]]/g, "")}` : s.title.replace(/[[\]]/g, "")}</h3>
          <Markdown source={s.body} headingOffset={1} />
        </section>
      ))}
    </Modal>
  );
}
