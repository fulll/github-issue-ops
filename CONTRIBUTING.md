# Contributing to github-issue-ops

Thank you for taking the time to contribute! This document describes how to set up a development environment, run tests, and submit changes.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- A GitHub personal access token with `repo` and `read:org` scopes

## Development setup

```bash
git clone https://github.com/fulll/github-issue-ops
cd github-issue-ops
bun install
```

## Project structure

```
github-issue-ops.ts    # CLI entry point (Commander: issue create/refresh/dispatch, upgrade)
build.ts               # Build script (compiles the standalone binary)
src/
  types.ts             # Shared TypeScript interfaces (source of truth)
  upgrade.ts           # Auto-upgrade logic
  test-setup.ts        # Global test setup

  api/
    github-api.ts      # GitHub REST API client
    api-utils.ts       # Retry + pagination helpers
    api-utils.test.ts

  core/
    metadata.ts        # Embed/extract HTML comment metadata in issue body
    metadata.test.ts
    checklist.ts       # Build/parse/diff/apply Markdown checklists
    checklist.test.ts
    ownership.ts       # Resolver chain for assignee detection
    ownership.test.ts
    dedup.ts           # Detect existing dispatch issues
    dedup.test.ts

  input/
    stdin.ts           # readStdin + format detection + parseResults
    stdin.test.ts

  output/
    format.ts          # Body builders (EPIC, sub-issue, plan table)

  tui/
    editor.ts          # Spawn $EDITOR for interactive body editing

  commands/
    create.ts          # issue create orchestration
    refresh.ts         # issue refresh orchestration
    dispatch.ts        # issue dispatch orchestration

dist/                  # Compiled binary (git-ignored)
```

## Key architectural boundaries

| Layer        | Location                                 | Rule                                       |
| ------------ | ---------------------------------------- | ------------------------------------------ |
| Shared types | `src/types.ts`                           | All new interfaces go here                 |
| Pure logic   | `src/core/`, `src/input/`, `src/output/` | Pure functions only — no I/O               |
| API client   | `src/api/github-api.ts`                  | Only place allowed to call GitHub REST API |
| API utils    | `src/api/api-utils.ts`                   | Only used by `github-api.ts`               |
| Editor spawn | `src/tui/editor.ts`                      | Only place that spawns $EDITOR             |
| CLI parsing  | `github-issue-ops.ts`                    | Commander commands and action handlers     |
| Auto-upgrade | `src/upgrade.ts`                         | Binary self-replacement logic              |

## Running tests

```bash
bun test
bun test --watch    # re-run on file changes
```

## Building a self-contained binary

```bash
bun run build.ts

# Cross-compile
bun run build.ts --target=bun-linux-x64
bun run build.ts --target=bun-linux-x64-baseline
bun run build.ts --target=bun-linux-arm64
bun run build.ts --target=bun-darwin-x64
bun run build.ts --target=bun-darwin-arm64
bun run build.ts --target=bun-windows-x64
```

The build injects the git commit SHA, target OS, and architecture:

```
0.1.0 (a1b2c3d · darwin/arm64)
```

## Code style

- TypeScript throughout. Pure functions wherever possible.
- Run `bun run lint` (oxlint) — zero errors required.
- Run `bun run format:check` (oxfmt) — auto-fix locally with `bun run format`.
- Run `bun run knip` — no unused exports.

## Submitting a pull request

1. Fork and create a branch: `git checkout -b feat/my-feature`
2. Make your changes, add or update tests
3. Ensure `bun test && bun run lint && bun run format:check && bun run knip` pass
4. Open a PR against `main` with a clear description

## Reporting bugs

Please open an issue and include:

- The exact command you ran (with `GITHUB_TOKEN` redacted)
- Observed vs expected output
- `github-issue-ops --version` output
- `bun --version` if running from source
