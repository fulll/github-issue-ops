// ─── issue refresh ────────────────────────────────────────────────────────────
//
// Refreshes an existing EPIC issue with a new result set (stdin).
// Computes a diff between the stored checklist and the new results:
//   - New items are appended (unchecked)
//   - Removed items are struck-through / checked-off
//   - Unchanged items keep their current checked state
//
// If the refreshed body exceeds BODY_LIMIT, overflow is posted as a comment.
//
// Usage:
//   github-code-search ... | github-issue-ops issue refresh \
//     --issue fulll/platform#42

import * as p from "@clack/prompts";
import pc from "picocolors";
import { readStdin, parseResults } from "../input/stdin.ts";
import { applyDiff, diffChecklist, parseChecklist, updateSummaryBlock } from "../core/checklist.ts";
import { extractMetadata, updateMetadata } from "../core/metadata.ts";
import { bodyLengthWarning, splitBodyAtLimit } from "../output/format.ts";
import { getIssue, updateIssue, addComment } from "../api/github-api.ts";

export interface RefreshOptions {
  issue: string;
  token: string;
  dryRun: boolean;
  nonInteractive: boolean;
}

export async function refreshAction(options: RefreshOptions): Promise<void> {
  p.intro(pc.bold("github-issue-ops") + pc.dim(" · issue refresh"));

  // ── Parse issue ref ───────────────────────────────────────────────────────
  const parsed = parseIssueRef(options.issue);
  if (!parsed) {
    p.cancel(`Invalid --issue format. Expected owner/repo#number, got: ${options.issue}`);
    process.exit(1);
  }
  const { owner, repo, number } = parsed;

  // ── Read stdin ────────────────────────────────────────────────────────────
  const raw = await readStdin();
  if (!raw) {
    p.cancel("No input detected. Pipe updated github-code-search results into stdin.");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Parsing new results…");
  const newResults = parseResults(raw);
  s.stop(`Parsed ${pc.bold(String(newResults.items.length))} items.`);

  // ── Fetch existing issue ──────────────────────────────────────────────────
  const s2 = p.spinner();
  s2.start(`Fetching issue ${owner}/${repo}#${number}…`);
  const existing = await getIssue(options.token, owner, repo, number);
  s2.stop(`Fetched: ${pc.dim(existing.title)}`);

  // ── Diff ──────────────────────────────────────────────────────────────────
  const oldItems = parseChecklist(existing.body ?? "");
  const diff = diffChecklist(oldItems, newResults.items);

  if (diff.added.length === 0 && diff.removed.length === 0) {
    p.outro(pc.dim("No changes detected — checklist is already up to date."));
    return;
  }

  p.log.info(
    [
      diff.added.length > 0 ? pc.green(`+${diff.added.length} added`) : "",
      diff.removed.length > 0 ? pc.red(`-${diff.removed.length} removed`) : "",
      diff.unchanged.length > 0 ? pc.dim(`${diff.unchanged.length} unchanged`) : "",
    ]
      .filter(Boolean)
      .join("  "),
  );

  // ── Apply diff ────────────────────────────────────────────────────────────
  let newBody = applyDiff(existing.body ?? "", diff);

  // Update summary stats
  const allItems = parseChecklist(newBody);
  const stats = {
    total: allItems.length,
    resolved: allItems.filter((i) => i.checked).length,
    added: diff.added.length,
  };
  newBody = updateSummaryBlock(newBody, stats);

  // Update metadata (new replay command if provided)
  const oldMeta = extractMetadata(existing.body ?? "");
  if (oldMeta) {
    const patch: Record<string, unknown> = {};
    if (newResults.replayCommand) patch["replayCommand"] = newResults.replayCommand;
    newBody = updateMetadata(newBody, patch);
  }

  // ── Length check ──────────────────────────────────────────────────────────
  const warning = bodyLengthWarning(newBody);
  if (warning) p.log.warn(warning);
  const [mainBody, overflow] = splitBodyAtLimit(newBody);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (options.dryRun) {
    p.log.info(pc.dim("─── DRY RUN: updated body ───\n") + mainBody);
    if (overflow) p.log.info(pc.dim("─── overflow comment ───\n") + overflow);
    p.outro(pc.dim("Dry run — issue not updated."));
    return;
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (!options.nonInteractive) {
    const ok = await p.confirm({
      message: `Update ${pc.bold(`${owner}/${repo}#${number}`)}?`,
    });
    if (p.isCancel(ok) || !ok) {
      p.cancel("Aborted.");
      return;
    }
  }

  // ── Update issue ──────────────────────────────────────────────────────────
  const s3 = p.spinner();
  s3.start("Updating issue body…");
  const updated = await updateIssue(options.token, owner, repo, number, { body: mainBody });
  s3.stop(`Updated: ${pc.bold(pc.cyan(updated.html_url))}`);

  if (overflow) {
    const s4 = p.spinner();
    s4.start("Posting overflow comment…");
    await addComment(options.token, owner, repo, number, overflow);
    s4.stop("Overflow comment posted.");
  }

  p.outro(pc.green("✔") + " EPIC issue refreshed: " + pc.bold(pc.cyan(updated.html_url)));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface IssueRef {
  owner: string;
  repo: string;
  number: number;
}

/**
 * Parses a GitHub issue reference in the form `owner/repo#number`.
 * Also accepts a full URL: `https://github.com/owner/repo/issues/number`.
 */
export function parseIssueRef(ref: string): IssueRef | null {
  // Full URL form
  const urlMatch = ref.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (urlMatch) {
    return { owner: urlMatch[1]!, repo: urlMatch[2]!, number: Number(urlMatch[3]) };
  }
  // Short form: owner/repo#number
  const shortMatch = ref.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1]!, repo: shortMatch[2]!, number: Number(shortMatch[3]) };
  }
  return null;
}
