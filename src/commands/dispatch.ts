// ─── issue dispatch ───────────────────────────────────────────────────────────
//
// Creates (or updates) one sub-issue per repository found in an EPIC's checklist.
// Supports two modes:
//   --mode plan   → show what would be created/skipped (dry-run view)
//   --mode apply  → actually create/update the issues
//
// Usage:
//   github-issue-ops issue dispatch \
//     --epic fulll/platform#42 \
//     --mode plan
//
//   github-issue-ops issue dispatch \
//     --epic fulll/platform#42 \
//     --label github-issue-ops \
//     --team-prefix team- \
//     --mode apply

import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  getIssue,
  createIssue,
  updateIssue,
  addComment,
  createSubIssueLink,
} from "../api/github-api.ts";
import { parseChecklist } from "../core/checklist.ts";
import { extractMetadata } from "../core/metadata.ts";
import { resolveOwners } from "../core/ownership.ts";
import { findExistingDispatchIssue } from "../core/dedup.ts";
import {
  buildSubIssueBody,
  buildPlanTable,
  printDispatchSummary,
  splitBodyAtLimit,
} from "../output/format.ts";
import { parseIssueRef } from "./refresh.ts";
import type {
  ChecklistItem,
  DispatchGroup,
  ResolvedDispatchGroup,
  OwnershipContext,
} from "../types.ts";

export interface DispatchOptions {
  epic: string;
  label: string[];
  teamPrefix: string[];
  centralRepo?: string;
  mode: "plan" | "apply";
  token: string;
  nonInteractive: boolean;
}

export async function dispatchAction(options: DispatchOptions): Promise<void> {
  p.intro(pc.bold("github-issue-ops") + pc.dim(" · issue dispatch"));

  // ── Parse EPIC ref ────────────────────────────────────────────────────────
  const epicRef = parseIssueRef(options.epic);
  if (!epicRef) {
    p.cancel(`Invalid --epic format. Expected owner/repo#number, got: ${options.epic}`);
    process.exit(1);
  }
  const { owner, repo, number } = epicRef;

  // ── Fetch EPIC issue ──────────────────────────────────────────────────────
  const s = p.spinner();
  s.start(`Fetching EPIC ${owner}/${repo}#${number}…`);
  const epic = await getIssue(options.token, owner, repo, number);
  s.stop(`EPIC: ${pc.bold(epic.title)}`);

  const epicUrl = epic.html_url;

  // ── Parse checklist ───────────────────────────────────────────────────────
  const items = parseChecklist(epic.body ?? "");
  if (items.length === 0) {
    p.cancel("No checklist items found in EPIC body.");
    process.exit(1);
  }

  const meta = extractMetadata(epic.body ?? "");
  const org = meta?.config?.teamPrefixes ? owner : owner;

  // ── Group items by repo ───────────────────────────────────────────────────
  const groups = groupByRepo(items);
  p.log.info(
    `Found ${pc.bold(String(groups.length))} repos across ${pc.bold(String(items.length))} items.`,
  );

  // ── Resolve ownership + dedup ─────────────────────────────────────────────
  const s2 = p.spinner();
  s2.start("Resolving owners and checking for existing issues…");

  const effectivePrefixes =
    options.teamPrefix.length > 0 ? options.teamPrefix : meta?.config?.teamPrefixes;

  const resolved: ResolvedDispatchGroup[] = [];

  for (const group of groups) {
    const ctx: OwnershipContext = {
      token: options.token,
      org,
      repoName: group.repo,
      repoFullName: `${owner}/${group.repo}`,
      items: group.items,
      teamPrefixes: effectivePrefixes,
      centralRepo: options.centralRepo ?? meta?.config?.centralRepo,
    };

    const assignees = await resolveOwners(ctx);
    const existing = await findExistingDispatchIssue(options.token, owner, group.repo, epicUrl);

    const labels = ["github-issue-ops", ...(meta?.config?.labels ?? []), ...options.label];

    resolved.push({
      repo: group.repo,
      items: group.items,
      assignees,
      labels: [...new Set(labels)],
      status: existing ? "update" : "create",
      existingIssueNumber: existing ?? undefined,
    });
  }

  s2.stop("Owner resolution complete.");

  // ── Plan mode ─────────────────────────────────────────────────────────────
  const planRows = resolved.map((g) => ({
    repo: `${owner}/${g.repo}`,
    items: g.items.length,
    assignees: g.assignees,
    labels: g.labels,
    status: g.status as "create" | "skip" | "update",
    existingIssue: g.existingIssueNumber,
  }));

  process.stdout.write("\n" + buildPlanTable(planRows) + "\n");

  if (options.mode === "plan") {
    p.outro(pc.dim("Plan complete — run with --mode apply to execute."));
    return;
  }

  // ── Confirm apply ─────────────────────────────────────────────────────────
  if (!options.nonInteractive) {
    const ok = await p.confirm({
      message: `Create/update ${pc.bold(String(resolved.length))} issues?`,
    });
    if (p.isCancel(ok) || !ok) {
      p.cancel("Aborted.");
      return;
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0, total: resolved.length };

  for (const group of resolved) {
    const repoFullName = `${owner}/${group.repo}`;
    const body = buildSubIssueBody(
      { repo: group.repo, items: group.items, assignees: group.assignees, labels: group.labels },
      epicUrl,
    );
    const [mainBody, overflow] = splitBodyAtLimit(body);
    const title = `[github-issue-ops] ${group.repo}`;

    try {
      if (group.status === "update" && group.existingIssueNumber) {
        const updated = await updateIssue(
          options.token,
          owner,
          group.repo,
          group.existingIssueNumber,
          { body: mainBody },
        );
        p.log.step(
          `${pc.yellow("↻")} Updated ${repoFullName}#${group.existingIssueNumber} — ${pc.dim(updated.html_url)}`,
        );
        if (overflow) {
          await addComment(options.token, owner, group.repo, group.existingIssueNumber, overflow);
        }
        stats.updated++;
      } else {
        const created = await createIssue(options.token, owner, group.repo, {
          title,
          body: mainBody,
          labels: group.labels,
          assignees: group.assignees,
        });
        p.log.step(
          `${pc.green("✔")} Created ${repoFullName}#${created.number} — ${pc.dim(created.html_url)}`,
        );
        if (overflow) {
          await addComment(options.token, owner, group.repo, created.number, overflow);
        }
        // Link to EPIC as sub-issue (best-effort)
        await createSubIssueLink(options.token, owner, repo, number, created.id);
        stats.created++;
      }
    } catch (err) {
      p.log.error(`${pc.red("✘")} Failed ${repoFullName}: ${(err as Error).message}`);
      stats.failed++;
    }
  }

  printDispatchSummary(stats);
  p.outro(pc.green("✔") + " Dispatch complete.");
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupByRepo(items: ChecklistItem[]): DispatchGroup[] {
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const list = map.get(item.repo) ?? [];
    list.push(item);
    map.set(item.repo, list);
  }
  return Array.from(map.entries()).map(([repo, repoItems]) => ({
    repo,
    items: repoItems,
    assignees: [],
    labels: [],
  }));
}
