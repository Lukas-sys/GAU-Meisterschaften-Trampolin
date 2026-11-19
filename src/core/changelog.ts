/**
 * CHANGELOG.md lesen und einfaches Markdown in Blöcke zerlegen.
 * Ohne Importe, damit auch scripts/release-notes.mjs die Datei direkt laden kann.
 */

export interface ChangelogSection {
  /** Überschrift ohne „## “, z. B. „[1.0.0] – 2026-11-21“. */
  title: string;
  /** Versionsnummer aus der Überschrift; null für „Unveröffentlicht“. */
  version: string | null;
  /** Inhalt unter der Überschrift bis zur nächsten Version. */
  body: string;
}

const VERSION_PATTERN = /\[?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?/;

/** Zerlegt das Changelog in die Abschnitte unter den „## “-Überschriften. */
export function changelogSections(markdown: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: { title: string; lines: string[] } | null = null;
  const finish = () => {
    if (!current) return;
    sections.push({
      title: current.title,
      version: current.title.match(VERSION_PATTERN)?.[1] ?? null,
      body: current.lines.join("\n").trim(),
    });
  };
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = line.match(/^## (?!#)(.*)$/);
    if (heading) {
      finish();
      current = { title: heading[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  finish();
  return sections;
}

/** Abschnitt einer Version, z. B. „1.2.0“ oder „v1.2.0“. */
export function changelogSection(markdown: string, version: string): ChangelogSection | undefined {
  const wanted = version.replace(/^v/, "");
  return changelogSections(markdown).find((s) => s.version === wanted);
}

export interface MarkdownListItem {
  text: string;
  children: MarkdownListItem[];
}

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: MarkdownListItem[] };

/** Überschriften, Absätze und (verschachtelte) Aufzählungen; mehr braucht das Changelog nicht. */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  // Stapel offener Listen: Einrückung und die Liste, in die neue Punkte kommen
  let stack: { indent: number; items: MarkdownListItem[] }[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const closeList = () => {
    stack = [];
  };

  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\t/g, "  ");
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const item = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
    } else if (item) {
      flushParagraph();
      const indent = item[1].length;
      const entry: MarkdownListItem = { text: item[2].trim(), children: [] };
      if (stack.length === 0) {
        const items: MarkdownListItem[] = [];
        blocks.push({ type: "list", items });
        stack.push({ indent, items });
      }
      while (stack.length > 1 && indent < stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];
      if (indent > top.indent && top.items.length > 0) {
        const parent = top.items[top.items.length - 1];
        stack.push({ indent, items: parent.children });
      }
      stack[stack.length - 1].items.push(entry);
    } else if (stack.length > 0 && /^\s+\S/.test(line)) {
      // Fortsetzungszeile eines Listenpunkts
      const items = stack[stack.length - 1].items;
      items[items.length - 1].text += ` ${line.trim()}`;
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  return blocks;
}
