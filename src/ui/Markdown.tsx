import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type MarkdownListItem } from "../core";

/** `Code`, **fett** und [Links](…) (nur als Text, Links öffnen sich hier nicht). */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]*\))/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\([^)]*\)$/);
    if (link) return <Fragment key={i}>{link[1]}</Fragment>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function List({ items }: { items: MarkdownListItem[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          {inline(item.text)}
          {item.children.length > 0 && <List items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

/** Zeigt einfaches Markdown (Changelog, Release-Text) an. */
export function Markdown({ source, headingOffset = 0 }: { source: string; headingOffset?: number }) {
  return (
    <div className="markdown">
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "list") return <List key={i} items={block.items} />;
        if (block.type === "paragraph") return <p key={i}>{inline(block.text)}</p>;
        const level = Math.min(6, block.level + headingOffset);
        const Tag = `h${level}` as "h2";
        return <Tag key={i}>{inline(block.text)}</Tag>;
      })}
    </div>
  );
}
