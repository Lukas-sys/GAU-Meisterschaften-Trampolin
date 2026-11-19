import type { Issue } from "../core";

export function IssueList({ issues, title }: { issues: Issue[]; title?: string }) {
  if (issues.length === 0) return null;
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  const summary = [
    errors > 0 && `${errors} Fehler`,
    warnings > 0 && `${warnings} ${warnings === 1 ? "Hinweis" : "Hinweise"}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <details className={errors > 0 ? "issues issues-error" : "issues issues-warning"}>
      <summary>
        {title ?? "Prüfung"}: {summary}
      </summary>
      <ul>
        {issues.map((issue, i) => (
          <li key={i} className={issue.severity}>
            {issue.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
