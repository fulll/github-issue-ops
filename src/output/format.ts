// ─── Output formatters ────────────────────────────────────────────────────────
//
// Builds GitHub issue bodies and terminal output from structured data.

import pc from "picocolors";
import {
  buildChecklist,
  buildSummaryBlock,
  checkBodyLength,
  BODY_LIMIT,
} from "../core/checklist.ts";
import { embedMetadata } from "../core/metadata.ts";
import type { DispatchGroup, EpicConfig, EpicMetadata, ParsedResults } from "../types.ts";

// ─── Epic body ────────────────────────────────────────────────────────────────

/**
 * Builds the full body of an EPIC issue.
 *
 * Structure:
 *   {template preamble}
 *
 *   ## Affected files
 *
 *   {checklist}
 *
 *   {summary block}
 *
 *   <!-- github-issue-ops:metadata {...} -->
 */
export function buildEpicBody(
  results: ParsedResults,
  config: EpicConfig,
  preamble?: string,
): string {
  const checklist = buildChecklist(results.items);
  const stats = {
    total: results.items.length,
    resolved: results.items.filter((i) => i.checked).length,
    added: 0,
  };
  const summary = buildSummaryBlock(stats);

  const sections: string[] = [];
  if (preamble) sections.push(preamble.trimEnd());
  sections.push("## Affected files\n");
  sections.push(checklist);
  sections.push(summary);

  const body = sections.join("\n\n");

  const meta: EpicMetadata = {
    version: 1,
    replayCommand: results.replayCommand,
    createdAt: new Date().toISOString(),
    config,
  };

  return embedMetadata(body, meta);
}

// ─── Sub-issue body ───────────────────────────────────────────────────────────

/**
 * Builds the body for a dispatch sub-issue targeting a specific repo.
 *
 * Structure:
 *   > Part of EPIC: {epicUrl}
 *
 *   ## Files in `{repo}`
 *
 *   {checklist}
 */
export function buildSubIssueBody(group: DispatchGroup, epicUrl: string): string {
  const checklist = buildChecklist(group.items);
  const header = `> Part of EPIC: ${epicUrl}`;
  const title = `## Files in \`${group.repo}\``;

  return [header, "", title, "", checklist].join("\n");
}

// ─── Plan table ───────────────────────────────────────────────────────────────

interface PlanRow {
  repo: string;
  items: number;
  assignees: string[];
  labels: string[];
  status: "create" | "skip" | "update";
  existingIssue?: number;
}

/**
 * Pads a string to `n` characters, truncating if necessary.
 */
function pad(s: string, n: number): string {
  return s.slice(0, n).padEnd(n);
}

/**
 * Builds a colorized terminal table for `issue dispatch --mode plan`.
 */
export function buildPlanTable(rows: PlanRow[]): string {
  const COL_REPO = 40;
  const COL_ITEMS = 7;
  const COL_ASSIGNEES = 30;
  const COL_STATUS = 12;

  const header =
    pc.bold(pad("Repo", COL_REPO)) +
    "  " +
    pc.bold(pad("Items", COL_ITEMS)) +
    "  " +
    pc.bold(pad("Assignees", COL_ASSIGNEES)) +
    "  " +
    pc.bold(pad("Action", COL_STATUS));

  const divider = "─".repeat(COL_REPO + COL_ITEMS + COL_ASSIGNEES + COL_STATUS + 6);

  const lines = rows.map((row) => {
    const assigneeStr = row.assignees.length > 0 ? row.assignees.join(", ") : pc.dim("(none)");
    const statusStr =
      row.status === "create"
        ? pc.green("create")
        : row.status === "update"
          ? pc.yellow(`update #${row.existingIssue}`)
          : pc.dim("skip");

    return (
      pad(row.repo, COL_REPO) +
      "  " +
      pad(String(row.items), COL_ITEMS) +
      "  " +
      pad(assigneeStr, COL_ASSIGNEES) +
      "  " +
      statusStr
    );
  });

  return [header, divider, ...lines].join("\n");
}

// ─── Body length warning ──────────────────────────────────────────────────────

/**
 * Returns a warning string if the body approaches or exceeds BODY_LIMIT.
 */
export function bodyLengthWarning(body: string): string | null {
  const { ok, length, limit } = checkBodyLength(body);
  if (ok) {
    const pct = Math.round((length / limit) * 100);
    if (pct >= 90) {
      return pc.yellow(
        `⚠ Issue body is ${pct}% of the ${limit.toLocaleString()} char limit (${length.toLocaleString()} chars).`,
      );
    }
    return null;
  }
  return pc.red(
    `✘ Issue body exceeds the ${limit.toLocaleString()} char limit (${length.toLocaleString()} chars). ` +
      `Excess content will be pushed as a follow-up comment.`,
  );
}

// ─── Overflow handling ────────────────────────────────────────────────────────

/**
 * Splits the body at BODY_LIMIT, returns [truncatedBody, overflow].
 * The truncated body gets a note that overflow was posted as a comment.
 * If no overflow, returns [body, null].
 */
export function splitBodyAtLimit(body: string): [string, string | null] {
  if (body.length <= BODY_LIMIT) return [body, null];

  // Find the last newline before the limit to avoid cutting mid-line
  const cutIdx = body.lastIndexOf("\n", BODY_LIMIT);
  const safeIdx = cutIdx > 0 ? cutIdx : BODY_LIMIT;

  const truncated = body.slice(0, safeIdx);
  const overflow = body.slice(safeIdx).trimStart();

  const note = "\n\n> ⚠ Body truncated due to GitHub size limit. Continued in next comment.";
  return [truncated + note, overflow];
}

// ─── Dispatch summary ─────────────────────────────────────────────────────────

interface DispatchSummaryStats {
  created: number;
  skipped: number;
  updated: number;
  failed: number;
  total: number;
}

/**
 * Prints a human-readable dispatch summary to stdout.
 */
export function printDispatchSummary(stats: DispatchSummaryStats): void {
  const parts: string[] = [];
  if (stats.created > 0) parts.push(pc.green(`${stats.created} created`));
  if (stats.updated > 0) parts.push(pc.yellow(`${stats.updated} updated`));
  if (stats.skipped > 0) parts.push(pc.dim(`${stats.skipped} skipped`));
  if (stats.failed > 0) parts.push(pc.red(`${stats.failed} failed`));

  process.stdout.write(
    `\n${pc.bold("Dispatch complete:")} ${stats.total} repos — ${parts.join(", ")}\n`,
  );
}
