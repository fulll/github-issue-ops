// ─── stdin reader + format detection + parser ─────────────────────────────────
//
// Pure I/O module: reads stdin, detects format, and parses the results.
// The only module allowed to read from process.stdin.

import type { ParsedResults, SearchResult } from "../types.ts";

// ─── Read stdin ───────────────────────────────────────────────────────────────

/**
 * Reads all of stdin into a string.
 * Returns null if stdin is a TTY (interactive terminal with no piped input).
 */
export async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Detects whether the content is JSON or Markdown.
 * Tries JSON.parse; if it succeeds and the result is an array or object, returns "json".
 * Falls back to "markdown".
 */
export function detectFormat(content: string): "json" | "markdown" {
  const trimmed = content.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // not valid JSON
    }
  }
  return "markdown";
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

/**
 * Parses github-code-search JSON output (--format json).
 *
 * Expected shape (github-code-search JSON output):
 * Array of repo groups: [{ repoFullName, matches: [{ path, textMatches: [{ fragment, matches }] }] }]
 * OR flat array of SearchResult objects.
 */
export function parseJson(content: string): ParsedResults {
  const parsed = JSON.parse(content);

  // Case 1: flat array of SearchResult-like objects
  if (Array.isArray(parsed) && parsed.length > 0 && "repo" in parsed[0]) {
    return {
      items: (parsed as SearchResult[]).filter((item) => item.repo && item.path),
    };
  }

  // Case 2: wrapper object { items: SearchResult[], replayCommand? }
  if (
    !Array.isArray(parsed) &&
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray(parsed.items)
  ) {
    const checked = (parsed.items as SearchResult[]).filter((item) => item.repo && item.path);
    return {
      items: checked,
      replayCommand: typeof parsed.replayCommand === "string" ? parsed.replayCommand : undefined,
    };
  }

  // Case 3: github-code-search JSON format (array of repo groups)
  if (Array.isArray(parsed)) {
    const items: SearchResult[] = [];
    for (const group of parsed) {
      const repoFullName: string = group.repoFullName ?? group.repo ?? "";
      const matches: Array<{
        path: string;
        textMatches?: Array<{
          fragment?: string;
          matches?: Array<{ text?: string; indices?: number[] }>;
        }>;
      }> = group.matches ?? [];
      for (const match of matches) {
        const path: string = match.path ?? "";
        const textMatches = match.textMatches ?? [];
        for (const tm of textMatches) {
          const fragment = tm.fragment ?? "";
          const segments = tm.matches ?? [];
          if (segments.length === 0) {
            items.push({ repo: repoFullName, path, line: 0, text: fragment.substring(0, 120) });
          } else {
            for (const seg of segments) {
              items.push({
                repo: repoFullName,
                path,
                line: 0,
                text: seg.text ?? fragment.substring(0, 120),
              });
            }
          }
        }
        if (textMatches.length === 0) {
          items.push({ repo: repoFullName, path, line: 0, text: "" });
        }
      }
    }
    return { items };
  }

  return { items: [] };
}

// ─── Markdown parser ──────────────────────────────────────────────────────────

/**
 * Parses github-code-search Markdown output.
 *
 * Looks for lines like:
 *   - [ ] `owner/repo` — `path:line` — text
 *   - [x] `owner/repo` — `path:line` — text
 *
 * Also extracts:
 *   - Replay command: lines after "# Replay:" that start with "github-code-search"
 *   - Org: from --org flag in the replay command
 *   - Query: first argument of the replay command
 */
export function parseMarkdown(content: string): ParsedResults {
  const items: SearchResult[] = [];
  let replayCommand: string | undefined;
  let org: string | undefined;
  let query: string | undefined;

  const lines = content.split("\n");
  let inReplay = false;
  const replayLines: string[] = [];

  for (const line of lines) {
    // Checklist item: - [ ] or - [x]
    const checklistMatch = line.match(/^- \[([ x])\] `([^`]+)` — `([^:]+):(\d+)` — (.*)$/);
    if (checklistMatch) {
      const [, checked, repo, path, lineStr, text] = checklistMatch;
      items.push({
        repo,
        path,
        line: parseInt(lineStr, 10) || 0,
        text: text.trim(),
        checked: checked === "x",
      });
      continue;
    }

    // Checklist item (alternative without line number): - [ ] `repo` — `path` — text
    const checklistNoLine = line.match(/^- \[([ x])\] `([^`]+)` — `([^`]+)` — (.*)$/);
    if (checklistNoLine) {
      const [, checked, repo, path, text] = checklistNoLine;
      items.push({ repo, path, line: 0, text: text.trim(), checked: checked === "x" });
      continue;
    }

    // Replay section
    if (line.trim() === "# Replay:" || line.trim().startsWith("# Replay")) {
      inReplay = true;
      continue;
    }
    if (inReplay) {
      const trimmed = line.trim().replace(/\\$/, "").trim();
      if (trimmed.startsWith("github-code-search") || trimmed.startsWith("--")) {
        replayLines.push(trimmed);
      } else if (line.trim() === "" && replayLines.length > 0) {
        inReplay = false;
      }
    }
  }

  if (replayLines.length > 0) {
    replayCommand = replayLines.join(" \\\n  ");
    // Extract org and query from replay command
    const orgMatch = replayCommand.match(/--org\s+(\S+)/);
    if (orgMatch) org = orgMatch[1];
    const queryMatch = replayCommand.match(/github-code-search\s+"([^"]+)"/);
    if (queryMatch) query = queryMatch[1];
  }

  return { items, replayCommand, org, query };
}

// ─── Main parse entry point ───────────────────────────────────────────────────

/**
 * Parses stdin content into structured results.
 * @param content  Raw stdin string
 * @param format   Explicit format override; if not provided, auto-detects.
 */
export function parseResults(content: string, format?: "json" | "markdown"): ParsedResults {
  const detectedFormat = format ?? detectFormat(content);
  if (detectedFormat === "json") {
    try {
      return parseJson(content);
    } catch {
      // Fall back to markdown if JSON fails
      return parseMarkdown(content);
    }
  }
  return parseMarkdown(content);
}
