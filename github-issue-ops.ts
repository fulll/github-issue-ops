#!/usr/bin/env bun
// ─── github-issue-ops ─────────────────────────────────────────────────────────
//
// CLI entry point. Mirrors the structure of github-code-search:
//   - program.exitOverride() so errors propagate via process.exit(1)
//   - Errors written to fd 2 via writeFileSync(2, ...) for clean UX
//   - GITHUB_TOKEN env var read automatically
//   - Help output colorized with picocolors when stdout is a TTY

import { program } from "commander";
import { writeFileSync } from "fs";
import pc from "picocolors";
import { createAction } from "./src/commands/create.ts";
import { refreshAction } from "./src/commands/refresh.ts";
import { dispatchAction } from "./src/commands/dispatch.ts";
import { checkForUpdate, performUpgrade } from "./src/upgrade.ts";

declare const BUILD_VERSION: string;
declare const BUILD_COMMIT: string;

const version =
  typeof BUILD_VERSION !== "undefined"
    ? BUILD_VERSION
    : (process.env["npm_package_version"] ?? "0.0.0-dev");
const commit = typeof BUILD_COMMIT !== "undefined" ? BUILD_COMMIT : "dev";

// ─── Help colorization ────────────────────────────────────────────────────────
// Only apply colours when stdout is connected to a real terminal.
// Pipes, CI redirects, and --no-color environments stay plain-text.
const HAS_COLOR = Boolean(process.stdout.isTTY);

/**
 * Walk a multi-line description and colour:
 *  • "Docs: <url>"    → dim label + cyan underlined URL
 *  • "Example: …"     → dim label + italic value
 *  • indent lines (code-like)  → dim
 */
function colorDesc(s: string): string {
  if (!HAS_COLOR) return s;
  return s
    .split("\n")
    .map((line) => {
      const docsMatch = line.match(/^(\s*Docs:\s*)(https?:\/\/\S+)$/);
      if (docsMatch) return pc.dim(docsMatch[1]) + pc.cyan(pc.underline(docsMatch[2]));
      const exampleMatch = line.match(/^(\s*Example:\s*)(.+)$/);
      if (exampleMatch) return pc.dim(exampleMatch[1]) + pc.italic(exampleMatch[2]);
      if (/^\s+(e\.g\.|owner\/|acme\/|fulll\/)/.test(line)) return pc.dim(line);
      return line;
    })
    .join("\n");
}

/** Cyan underlined hyperlink — falls back to plain when not a TTY. */
function helpLink(url: string): string {
  return HAS_COLOR ? pc.cyan(pc.underline(url)) : url;
}

/** Labelled help-text footer block (bold label + link on next line). */
function helpSection(label: string, url: string): string {
  const t = HAS_COLOR ? pc.bold(label) : label;
  return `\n${t}\n  ${helpLink(url)}`;
}

/** Commander configureHelp options shared by all commands. */
const helpFormatConfig = {
  styleTitle: (s: string) => (HAS_COLOR ? pc.bold(pc.yellow(s)) : s),
  styleCommandText: (s: string) => (HAS_COLOR ? pc.bold(s) : s),
  styleSubcommandText: (s: string) => (HAS_COLOR ? pc.cyan(s) : s),
  styleArgumentText: (s: string) => (HAS_COLOR ? pc.yellow(s) : s),
  styleOptionText: (s: string) => (HAS_COLOR ? pc.green(s) : s),
  styleOptionTerm: (s: string) => (HAS_COLOR ? pc.green(s) : s),
  styleSubcommandTerm: (s: string) => (HAS_COLOR ? pc.cyan(s) : s),
  styleArgumentTerm: (s: string) => (HAS_COLOR ? pc.yellow(s) : s),
  styleOptionDescription: colorDesc,
  styleSubcommandDescription: colorDesc,
  styleArgumentDescription: colorDesc,
  styleCommandDescription: colorDesc,
  styleDescriptionText: colorDesc,
};

function getToken(): string {
  const token = process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  if (!token) {
    writeFileSync(
      2,
      (HAS_COLOR ? pc.red("Error: ") : "Error: ") +
        "GITHUB_TOKEN (or GH_TOKEN) environment variable is not set.\n",
    );
    process.exit(1);
  }
  return token;
}

// ─── Program ──────────────────────────────────────────────────────────────────

program
  .name("github-issue-ops")
  .description("Industrialize GitHub issue campaigns from code-search results")
  .version(`${version} (${commit})`)
  .exitOverride()
  .configureHelp(helpFormatConfig)
  .addHelpText("after", helpSection("Documentation:", "https://fulll.github.io/github-issue-ops/"));

// ─── issue commands ───────────────────────────────────────────────────────────

const issue = program
  .command("issue")
  .description("Manage EPIC and dispatch issues")
  .configureHelp(helpFormatConfig);

// issue create
issue
  .command("create")
  .description("Create an EPIC issue from stdin (github-code-search output or JSON)")
  .configureHelp(helpFormatConfig)
  .addHelpText(
    "after",
    helpSection("Documentation:", "https://fulll.github.io/github-issue-ops/reference/create"),
  )
  .requiredOption("-r, --repo <owner/repo>", "Target repository for the EPIC issue")
  .option("-t, --title <title>", "Issue title")
  .option("-l, --label <label>", "Label to apply (repeatable)", collect, [])
  .option("-a, --assignee <login>", "Assignee login (repeatable)", collect, [])
  .option("--template <name>", "Issue template filename (e.g. epic.md)")
  .option(
    "--team-prefix <prefix>",
    [
      "Team name prefix for ownership resolution (repeatable).",
      "Example: team-backend,team-platform",
      "Docs: https://fulll.github.io/github-issue-ops/reference/create#team-prefix",
    ].join("\n"),
    collect,
    [],
  )
  .option("--non-interactive", "Disable interactive prompts", false)
  .option("--dry-run", "Print body without creating the issue", false)
  .action(async (opts) => {
    await createAction({ ...opts, token: getToken() }).catch(exitOnError);
  });

// issue refresh
issue
  .command("refresh")
  .description("Refresh an existing EPIC issue with updated results from stdin")
  .configureHelp(helpFormatConfig)
  .addHelpText(
    "after",
    helpSection("Documentation:", "https://fulll.github.io/github-issue-ops/reference/refresh"),
  )
  .requiredOption(
    "-i, --issue <owner/repo#number>",
    "EPIC issue reference (e.g. fulll/platform#42)",
  )
  .option("--non-interactive", "Disable interactive prompts", false)
  .option("--dry-run", "Print updated body without patching the issue", false)
  .action(async (opts) => {
    await refreshAction({ ...opts, token: getToken() }).catch(exitOnError);
  });

// issue dispatch
issue
  .command("dispatch")
  .description("Create one sub-issue per repository found in an EPIC checklist")
  .configureHelp(helpFormatConfig)
  .addHelpText(
    "after",
    helpSection("Documentation:", "https://fulll.github.io/github-issue-ops/reference/dispatch"),
  )
  .requiredOption("-e, --epic <owner/repo#number>", "EPIC issue reference (e.g. fulll/platform#42)")
  .option("-l, --label <label>", "Extra label to apply to each sub-issue (repeatable)", collect, [])
  .option(
    "--team-prefix <prefix>",
    [
      "Team name prefix for ownership resolution (repeatable).",
      "Example: team-backend,team-platform",
      "Docs: https://fulll.github.io/github-issue-ops/reference/dispatch#team-prefix",
    ].join("\n"),
    collect,
    [],
  )
  .option(
    "--central-repo <owner/repo>",
    [
      "Repo containing .github-issue-ops/owners.json mapping.",
      "Example: acme/platform",
      "Docs: https://fulll.github.io/github-issue-ops/reference/dispatch#central-repo",
    ].join("\n"),
  )
  .option("-m, --mode <plan|apply>", "plan = preview what would happen; apply = execute", "plan")
  .option("--non-interactive", "Disable interactive prompts", false)
  .action(async (opts) => {
    await dispatchAction({ ...opts, token: getToken() }).catch(exitOnError);
  });

// ─── upgrade ──────────────────────────────────────────────────────────────────

program
  .command("upgrade")
  .description("Upgrade github-issue-ops to the latest release")
  .configureHelp(helpFormatConfig)
  .option("--dry-run", "Check for updates without installing", false)
  .addHelpText(
    "after",
    "\n" +
      (HAS_COLOR
        ? pc.dim("Requires GITHUB_TOKEN for private release assets.")
        : "Requires GITHUB_TOKEN for private release assets."),
  )
  .action(async (opts: { dryRun: boolean }) => {
    if (opts.dryRun) {
      const latest = await checkForUpdate(version, process.env["GITHUB_TOKEN"]).catch(exitOnError);
      if (latest) {
        process.stdout.write(
          (HAS_COLOR ? pc.green("Update available: ") : "Update available: ") + latest + "\n",
        );
        process.stdout.write(
          HAS_COLOR
            ? pc.dim("Run without --dry-run to install.\n")
            : "Run without --dry-run to install.\n",
        );
      } else {
        process.stdout.write(
          HAS_COLOR
            ? pc.dim(`Already up to date (${version}).\n`)
            : `Already up to date (${version}).\n`,
        );
      }
      return;
    }
    await performUpgrade(version, process.execPath, process.env["GITHUB_TOKEN"]).catch(exitOnError);
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    exitOnError(err as Error);
  }
}

main().catch(exitOnError);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function exitOnError(err: Error): never {
  // Commander throws CommanderError on --help / --version — ignore those
  if ((err as { code?: string }).code === "commander.helpDisplayed") process.exit(0);
  if ((err as { code?: string }).code === "commander.version") process.exit(0);
  const prefix = HAS_COLOR ? pc.red("Error: ") : "Error: ";
  writeFileSync(2, `${prefix}${err.message}\n`);
  process.exit(1);
}
