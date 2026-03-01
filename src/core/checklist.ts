// ─── Markdown checklist builder / parser / differ ────────────────────────────
//
// Pure functions — no I/O. All functions operate on strings and plain objects.

import type { ChecklistItem, DiffResult, SearchResult } from "../types.ts";

// The practical GitHub API body size limit (with safety margin).
export const BODY_LIMIT = 65_000;

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Builds a Markdown checklist from an array of SearchResult items.
 * Format: - [ ] `repo` — `path:line` — text
 */
export function buildChecklist(results: SearchResult[]): string {
  if (results.length === 0) return "";
  const lines = results.map((r) => {
    const loc = r.line > 0 ? `${r.path}:${r.line}` : r.path;
    const text = r.text ? ` — ${r.text}` : "";
    const box = r.checked ? "x" : " ";
    return `- [${box}] \`${r.repo}\` — \`${loc}\`${text}`;
  });
  return lines.join("\n");
}

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parses Markdown checklist lines from an issue body.
 * Handles both `- [ ]` and `- [x]` markers.
 */
export function parseChecklist(body: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const line of body.split("\n")) {
    const match = line.match(/^- \[([ x])\] `([^`]+)` — `([^`:]+):(\d+)`(?:\s*—\s*(.*))?$/);
    if (match) {
      const [, checked, repo, path, lineStr, text] = match;
      items.push({
        checked: checked === "x",
        repo,
        path,
        line: parseInt(lineStr, 10) || 0,
        text: (text ?? "").trim(),
      });
      continue;
    }
    // Variant without line number
    const noLineMatch = line.match(/^- \[([ x])\] `([^`]+)` — `([^`]+)`(?:\s*—\s*(.*))?$/);
    if (noLineMatch) {
      const [, checked, repo, path, text] = noLineMatch;
      items.push({
        checked: checked === "x",
        repo,
        path,
        line: 0,
        text: (text ?? "").trim(),
      });
    }
  }
  return items;
}

// ─── Diff key ─────────────────────────────────────────────────────────────────

function itemKey(item: ChecklistItem): string {
  return `${item.repo}:${item.path}:${item.line}:${item.text}`;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

/**
 * Compares two snapshots of checklist items.
 * Key: `${repo}:${path}:${line}:${text}`.
 *   - `removed`: in old but not in new (candidates to check off)
 *   - `added`:   in new but not in old (new findings)
 *   - `unchanged`: in both
 */
export function diffChecklist(oldItems: ChecklistItem[], newItems: ChecklistItem[]): DiffResult {
  const oldMap = new Map(oldItems.map((i) => [itemKey(i), i]));
  const newMap = new Map(newItems.map((i) => [itemKey(i), i]));

  const removed: ChecklistItem[] = [];
  const unchanged: ChecklistItem[] = [];
  for (const [key, item] of oldMap) {
    if (newMap.has(key)) unchanged.push(item);
    else removed.push(item);
  }

  const added: ChecklistItem[] = [];
  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) added.push(item);
  }

  return { added, removed, unchanged };
}

// ─── Apply diff ───────────────────────────────────────────────────────────────

/**
 * Applies a diff to the issue body:
 *   - `removed` items: marks as `[x]` (resolved)
 *   - `added` items: inserts as new `[ ]` lines at the end of the checklist
 *   - `unchanged` items: preserves existing state (checked or unchecked)
 */
export function applyDiff(body: string, diff: DiffResult): string {
  const removedKeys = new Set(diff.removed.map(itemKey));
  const lines = body.split("\n");
  const updatedLines: string[] = [];

  for (const line of lines) {
    // Check if this line is a "removed" item that needs to be checked off
    const match = line.match(/^- \[ \] `([^`]+)` — `([^`:]+):(\d+)`(?:\s*—\s*(.*))?$/);
    if (match) {
      const [, repo, path, lineStr, text] = match;
      const key = `${repo}:${path}:${parseInt(lineStr, 10) || 0}:${(text ?? "").trim()}`;
      if (removedKeys.has(key)) {
        updatedLines.push(line.replace(/^- \[ \]/, "- [x]"));
        continue;
      }
    }
    // Variant without line number
    const noLineMatch = line.match(/^- \[ \] `([^`]+)` — `([^`]+)`(?:\s*—\s*(.*))?$/);
    if (noLineMatch) {
      const [, repo, path, text] = noLineMatch;
      const key = `${repo}:${path}:0:${(text ?? "").trim()}`;
      if (removedKeys.has(key)) {
        updatedLines.push(line.replace(/^- \[ \]/, "- [x]"));
        continue;
      }
    }
    updatedLines.push(line);
  }

  // Append newly added items at the end of the checklist block
  if (diff.added.length > 0) {
    // Find the last checklist line
    let lastChecklistIdx = -1;
    for (let i = updatedLines.length - 1; i >= 0; i--) {
      if (updatedLines[i].match(/^- \[[ x]\]/)) {
        lastChecklistIdx = i;
        break;
      }
    }
    const addedLines = buildChecklist(
      diff.added.map((item) => ({
        repo: item.repo,
        path: item.path,
        line: item.line,
        text: item.text,
        checked: item.checked,
      })),
    ).split("\n");
    if (lastChecklistIdx >= 0) {
      updatedLines.splice(lastChecklistIdx + 1, 0, ...addedLines);
    } else {
      updatedLines.push("", ...addedLines);
    }
  }

  return updatedLines.join("\n");
}

// ─── Summary block ────────────────────────────────────────────────────────────

/**
 * Builds a Markdown summary block to embed in the EPIC body.
 */
export function buildSummaryBlock(stats: {
  total: number;
  resolved: number;
  added: number;
}): string {
  return [
    "## Summary",
    "",
    `- **Total**: ${stats.total}`,
    `- **Resolved**: ${stats.resolved}`,
    `- **New since last refresh**: ${stats.added}`,
    "",
  ].join("\n");
}

const SUMMARY_SECTION_RE = /^## Summary\n([\s\S]*?)(?=\n## |\n<!-- |$)/m;

/**
 * Replaces the existing Summary section in `body`, or inserts it before
 * the metadata comment (or at the end if no metadata comment exists).
 */
export function updateSummaryBlock(
  body: string,
  stats: { total: number; resolved: number; added: number },
): string {
  const block = buildSummaryBlock(stats);
  if (SUMMARY_SECTION_RE.test(body)) {
    return body.replace(SUMMARY_SECTION_RE, block);
  }
  // Insert before metadata comment, or append
  const metaIdx = body.indexOf("<!-- github-issue-ops:metadata");
  if (metaIdx !== -1) {
    return body.slice(0, metaIdx).trimEnd() + "\n\n" + block + "\n" + body.slice(metaIdx);
  }
  return body.trimEnd() + "\n\n" + block;
}

// ─── Body length check ────────────────────────────────────────────────────────

/**
 * Checks whether the body is within the safe GitHub API limit.
 */
export function checkBodyLength(body: string): { ok: boolean; length: number; limit: number } {
  const length = new TextEncoder().encode(body).length;
  return { ok: length <= BODY_LIMIT, length, limit: BODY_LIMIT };
}
