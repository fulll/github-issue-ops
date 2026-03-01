#!/usr/bin/env bun
// ─── github-issue-ops ─────────────────────────────────────────────────────────
//
// CLI entry point. Mirrors the structure of github-code-search:
//   - program.exitOverride() so errors propagate via process.exit(1)
//   - Errors written to fd 2 via writeFileSync(2, ...) for clean UX
//   - GITHUB_TOKEN env var read automatically

import { program } from "commander";
import { writeFileSync } from "fs";
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

// ─── Global options ───────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  if (!token) {
    writeFileSync(2, "Error: GITHUB_TOKEN (or GH_TOKEN) environment variable is not set.\n");
    process.exit(1);
  }
  return token;
}

// ─── Program ──────────────────────────────────────────────────────────────────

program
  .name("github-issue-ops")
  .description("Industrialize GitHub issue campaigns from code-search results")
  .version(`${version} (${commit})`)
  .exitOverride();

// ─── issue commands ───────────────────────────────────────────────────────────

const issue = program.command("issue").description("Manage EPIC and dispatch issues");

// issue create
issue
  .command("create")
  .description("Create an EPIC issue from stdin (github-code-search output or JSON)")
  .requiredOption("-r, --repo <owner/repo>", "Target repository for the EPIC issue")
  .option("-t, --title <title>", "Issue title")
  .option("-l, --label <label>", "Label to apply (repeatable)", collect, [])
  .option("-a, --assignee <login>", "Assignee login (repeatable)", collect, [])
  .option("--template <name>", "Issue template filename (e.g. epic.md)")
  .option(
    "--team-prefix <prefix>",
    "Team name prefix for ownership resolution (repeatable)",
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
  .requiredOption("-e, --epic <owner/repo#number>", "EPIC issue reference (e.g. fulll/platform#42)")
  .option("-l, --label <label>", "Extra label to apply to each sub-issue (repeatable)", collect, [])
  .option(
    "--team-prefix <prefix>",
    "Team name prefix for ownership resolution (repeatable)",
    collect,
    [],
  )
  .option("--central-repo <owner/repo>", "Repo containing .github-issue-ops/owners.json mapping")
  .option("-m, --mode <plan|apply>", "plan = show what would happen; apply = execute", "plan")
  .option("--non-interactive", "Disable interactive prompts", false)
  .action(async (opts) => {
    await dispatchAction({ ...opts, token: getToken() }).catch(exitOnError);
  });

// ─── upgrade ──────────────────────────────────────────────────────────────────

program
  .command("upgrade")
  .description("Upgrade github-issue-ops to the latest release")
  .option("--dry-run", "Check for updates without installing", false)
  .addHelpText("after", "\nRequires GITHUB_TOKEN for private release assets.")
  .action(async (opts: { dryRun: boolean }) => {
    if (opts.dryRun) {
      const latest = await checkForUpdate(version, process.env["GITHUB_TOKEN"]).catch(exitOnError);
      if (latest) {
        process.stdout.write(`Update available: ${latest}\n`);
        process.stdout.write(`Run without --dry-run to install.\n`);
      } else {
        process.stdout.write(`Already up to date (${version}).\n`);
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
  writeFileSync(2, `Error: ${err.message}\n`);
  process.exit(1);
}
