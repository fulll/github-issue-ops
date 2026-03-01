# github-issue-ops — Agent instructions

This file provides context for AI coding agents (GitHub Copilot, Claude, Gemini, etc.) working in this repository.

## What this project does

`github-issue-ops` is a CLI (powered by [Bun](https://bun.sh)) to industrialize GitHub issue campaigns (tech debt, security, migration, compliance). It takes the output of [`github-code-search`](https://github.com/fulll/github-code-search) (or any Markdown/JSON input) and creates a structured GitHub issue campaign: an **EPIC** in a central repo, a **checklist** that can be refreshed, and **sub-issues** dispatched per repo. An `issue` command with 3 subcommands (`create`, `refresh`, `dispatch`) and an `upgrade` subcommand are exposed via [Commander](https://github.com/tj/commander.js).

## Runtime & toolchain

| Tool           | Version                                                  |
| -------------- | -------------------------------------------------------- |
| **Bun**        | ≥ 1.0 (runtime, bundler, test runner, package manager)   |
| **TypeScript** | via Bun (no separate `tsc` invocation needed at runtime) |
| **oxlint**     | linter (`bun run lint`)                                  |
| **oxfmt**      | formatter (`bun run format`)                             |
| **knip**       | dead-code detector (`bun run knip`)                      |

There is **no Node.js / npm** involved. Always use `bun` commands.

## Bootstrap

```bash
bun install          # install dependencies (reads bunfig.toml + package.json)
```

## Build commands

```bash
bun run build.ts                            # compile a self-contained binary → dist/github-issue-ops
bun run build.ts --target=bun-darwin-arm64  # cross-compile (see CONTRIBUTING.md for all targets)
```

## Running tests

```bash
bun test            # run the whole test suite
bun test --watch    # re-run on file changes (development)
```

All tests use Bun's built-in test runner. The setup file is `src/test-setup.ts`.

## Linting & formatting

```bash
bun run lint          # oxlint — must pass before submitting
bun run format        # oxfmt write (auto-fix)
bun run format:check  # oxfmt check (CI check)
bun run knip          # detect unused exports / files
```

## Project layout

```
github-issue-ops.ts    # CLI entry point — Commander: issue (create/refresh/dispatch), upgrade
build.ts               # Build script (Bun.build)
bunfig.toml            # Bun configuration (test preload)
tsconfig.json          # TypeScript configuration
knip.json              # knip (dead-code) configuration

src/
  types.ts             # All shared TypeScript interfaces (source of truth)
  upgrade.ts           # Auto-upgrade logic (fetch latest GitHub release, replace binary)
  test-setup.ts        # Global test setup (Bun preload)

  api/
    github-api.ts      # GitHub REST API client (issues, labels, teams, CODEOWNERS, templates)
    api-utils.ts       # Shared retry (fetchWithRetry) and pagination (paginatedFetch) helpers

  core/
    metadata.ts        # Embed/extract machine-readable metadata (HTML comment in issue body)
    checklist.ts       # Build/parse/diff/apply Markdown checklists
    ownership.ts       # Resolver chain: teams → CODEOWNERS → mapping → fallback
    dedup.ts           # Detect existing dispatch issues (idempotence)

  input/
    stdin.ts           # readStdin + auto-detect format (json/markdown) + parseResults

  output/
    format.ts          # Body builders (EPIC body, sub-issue body, plan display)

  tui/
    editor.ts          # Spawn $EDITOR on a tmp file for interactive body editing

  commands/
    create.ts          # issue create — orchestration
    refresh.ts         # issue refresh — orchestration
    dispatch.ts        # issue dispatch — orchestration

  *.test.ts            # Unit tests co-located with source files
```

## Key architectural principles

- **Pure functions first.** All business logic lives in pure, side-effect-free functions (`core/`, `input/`, `output/`). This makes them straightforward to unit-test.
- **Side effects are isolated.** API calls (`api/`), editor spawn (`tui/`), and CLI parsing (`github-issue-ops.ts`) are the only side-effectful surfaces.
- **`types.ts` is the single source of truth** for all shared interfaces. Any new shared type must go there.
- **No classes** — the codebase uses plain TypeScript interfaces and functions throughout.
- **`api/api-utils.ts`** hosts shared retry/pagination helpers used exclusively by `api/github-api.ts`.

## Metadata strategy

Machine-readable metadata is stored in the EPIC body as a trailing HTML comment (invisible in GitHub rendering):

```
<!-- github-issue-ops:metadata
{"version":1,"replayCommand":"...","createdAt":"...","config":{}}
-->
```

This allows `refresh` and `dispatch` to find the replay command without any external storage.

## Body length limit

GitHub's practical API limit for issue bodies is ~65 536 characters. The constant `BODY_LIMIT = 65_000` is defined in `src/core/checklist.ts`. On `issue create`: error if exceeded. On `issue refresh`: truncate + push overflow as a comment.

## Writing tests

- Test files: `<module>.test.ts`, co-located with their source file.
- Use `describe` / `it` / `expect` from Bun's test runner.
- Only pure functions are unit-tested; `api/github-api.ts` and `commands/*.ts` are not.
- `api/api-utils.ts` is tested by mocking `globalThis.fetch`.
- Tests must be self-contained: no network calls, no filesystem side effects.

## Git conventions

### Signed commits (required)

All commits **must be cryptographically signed** (GPG or SSH).

```bash
git config --global commit.gpgsign true
```

> ⚠️ **Do NOT use MCP REST API push tools** (`mcp_github_push_files`, `mcp_github_create_or_update_file`).
> Always commit locally via `git commit -S` and push with `git push`.

### Branch & commit conventions

| Branch type   | Pattern                        | Example                          |
| ------------- | ------------------------------ | -------------------------------- |
| Feature       | `feat/<short-description>`     | `feat/dispatch-ownership-chain`  |
| Bug fix       | `fix/<short-description>`      | `fix/body-overflow-on-refresh`   |
| Refactoring   | `refactor/<short-description>` | `refactor/extract-checklist-mod` |
| Documentation | `docs/<short-description>`     | `docs/vitepress-init`            |

Commit messages use **imperative mood**: `Add …`, `Fix …`, `Extract …`.

## Release process

```bash
bun pm version patch   # bug fix
bun pm version minor   # new feature
bun pm version major   # breaking change

git checkout -b release/$(jq -r .version package.json)
git add package.json
git commit -S -m "v$(jq -r .version package.json)"
git tag v$(jq -r .version package.json)
git push origin release/$(jq -r .version package.json) --tags
```

Pushing a tag `vX.Y.Z` triggers `cd.yaml` which compiles 6 targets and creates a GitHub Release.
