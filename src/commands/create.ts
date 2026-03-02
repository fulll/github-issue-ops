// ─── issue create ─────────────────────────────────────────────────────────────
//
// Creates an EPIC issue from a github-code-search result set (stdin or flags).
// Supports interactive mode (prompts via @clack/prompts) and non-interactive mode.
//
// Usage examples:
//   github-code-search ... | github-issue-ops issue create \
//     --repo fulll/platform --title "Update deps"
//
//   github-issue-ops issue create \
//     --repo fulll/platform --title "Update deps" \
//     --label epic --label security \
//     --template security_advisory.md \
//     --non-interactive

import * as p from "@clack/prompts";
import pc from "picocolors";
import { readStdin, parseResults } from "../input/stdin.ts";
import { buildEpicBody, bodyLengthWarning, splitBodyAtLimit } from "../output/format.ts";
import { createIssue, addComment, listLabels, listIssueTemplates } from "../api/github-api.ts";
import { openEditor } from "../tui/editor.ts";
import { reopenStdinAsTty } from "../tui/tty.ts";
import type { EpicConfig } from "../types.ts";

export interface CreateOptions {
  repo: string;
  title?: string;
  label: string[];
  assignee: string[];
  template?: string;
  teamPrefix: string[];
  nonInteractive: boolean;
  token: string;
  dryRun: boolean;
}

export async function createAction(options: CreateOptions): Promise<void> {
  const [owner, repoName] = options.repo.split("/");
  if (!owner || !repoName) {
    process.stderr.write(`${pc.red("✘")} Invalid --repo format. Expected owner/repo.\n`);
    process.exit(1);
  }

  // ── Read stdin (before any clack call) ───────────────────────────────────
  // Consume the pipe first, then reopen /dev/tty, then call p.intro() so that
  // clack captures the live terminal stream — not the already-EOF pipe.
  const raw = await readStdin();
  if (!raw) {
    process.stderr.write(
      `${pc.red("✘")} No input detected. Pipe github-code-search output or JSON results into stdin.\n`,
    );
    process.exit(1);
  }

  // ── Restore TTY before initialising clack ────────────────────────────────
  // After readStdin() the pipe is at EOF. Re-open /dev/tty so that every
  // clack prompt (text, confirm, select…) reads from the physical terminal.
  reopenStdinAsTty();

  p.intro(pc.bold("github-issue-ops") + pc.dim(" · issue create"));

  const s = p.spinner();
  s.start("Parsing results…");
  const results = parseResults(raw);
  s.stop(
    `Parsed ${pc.bold(String(results.items.length))} items across ${pc.bold(String(new Set(results.items.map((i) => i.repo)).size))} repos.`,
  );

  if (results.items.length === 0) {
    p.cancel("No checklist items found in input.");
    process.exit(1);
  }

  // ── Resolve title ─────────────────────────────────────────────────────────
  let title = options.title;
  if (!title && !options.nonInteractive) {
    const answer = await p.text({
      message: "Issue title:",
      validate: (v) => (v.trim().length > 0 ? undefined : "Title cannot be empty"),
    });
    if (p.isCancel(answer)) {
      p.cancel();
      process.exit(0);
    }
    title = answer as string;
  }
  if (!title) {
    process.stderr.write(`${pc.red("✘")} --title is required in --non-interactive mode.\n`);
    process.exit(1);
  }

  // ── Resolve labels ─────────────────────────────────────────────────────────
  let labels = options.label;
  if (labels.length === 0 && !options.nonInteractive) {
    const s2 = p.spinner();
    s2.start("Fetching available labels…");
    const available = await listLabels(options.token, owner, repoName).catch(() => []);
    s2.stop();
    if (available.length > 0) {
      const chosen = await p.multiselect({
        message: "Labels (optional):",
        options: available.map((l) => ({ label: l.name, value: l.name, hint: l.color })),
        required: false,
      });
      if (!p.isCancel(chosen)) labels = chosen as string[];
    }
  }

  // ── Resolve template ──────────────────────────────────────────────────────
  let templateName = options.template;
  if (!templateName && !options.nonInteractive) {
    const s3 = p.spinner();
    s3.start("Fetching issue templates…");
    const templates = await listIssueTemplates(options.token, owner, repoName).catch(() => []);
    s3.stop();
    if (templates.length > 0) {
      const chosen = await p.select({
        message: "Issue template (optional):",
        options: [
          { label: "(none)", value: "" },
          ...templates.map((t) => ({ label: t.name, value: t.name })),
        ],
      });
      if (!p.isCancel(chosen) && chosen) templateName = chosen as string;
    }
  }

  // ── Build config ──────────────────────────────────────────────────────────
  const config: EpicConfig = {
    repo: options.repo,
    labels: labels.length > 0 ? labels : undefined,
    assignees: options.assignee.length > 0 ? options.assignee : undefined,
    template: templateName || undefined,
    teamPrefixes: options.teamPrefix.length > 0 ? options.teamPrefix : undefined,
  };

  // ── Build body ────────────────────────────────────────────────────────────
  let body = buildEpicBody(results, config);

  // ── Editor round-trip ─────────────────────────────────────────────────────
  if (!options.nonInteractive) {
    const edit = await p.confirm({ message: "Open body in $EDITOR?" });
    if (!p.isCancel(edit) && edit) {
      try {
        body = openEditor(body);
      } catch (err) {
        p.log.warn(`Editor failed: ${(err as Error).message}`);
      }
    }
  }

  // ── Length check ──────────────────────────────────────────────────────────
  const warning = bodyLengthWarning(body);
  if (warning) p.log.warn(warning);

  const [mainBody, overflow] = splitBodyAtLimit(body);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (options.dryRun) {
    p.log.info(pc.dim("─── DRY RUN: issue body ───\n") + mainBody);
    if (overflow) p.log.info(pc.dim("─── overflow comment ───\n") + overflow);
    p.outro(pc.dim("Dry run — no issue created."));
    return;
  }

  // ── Create issue ──────────────────────────────────────────────────────────
  const s4 = p.spinner();
  s4.start("Creating issue…");
  const issue = await createIssue(options.token, owner, repoName, {
    title,
    body: mainBody,
    labels: labels.length > 0 ? labels : undefined,
    assignees: options.assignee.length > 0 ? options.assignee : undefined,
  });
  s4.stop(`Issue created: ${pc.bold(pc.cyan(issue.html_url))}`);

  if (overflow) {
    const s5 = p.spinner();
    s5.start("Posting overflow comment…");
    await addComment(options.token, owner, repoName, issue.number, overflow);
    s5.stop("Overflow comment posted.");
  }

  p.outro(pc.green("✔") + " EPIC issue ready: " + pc.bold(pc.cyan(issue.html_url)));
}
