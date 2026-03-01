---
applyTo: "**"
---

# github-issue-ops — project overview

`github-issue-ops` is a Bun-based CLI (`bun run build → dist/github-issue-ops`) for industrializing GitHub issue campaigns from `github-code-search` result sets.

## Three subcommands

| Command          | Purpose                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| `issue create`   | Reads stdin (markdown or JSON), creates an EPIC issue with a full checklist + metadata |
| `issue refresh`  | Reads new stdin results, diffs against the existing EPIC checklist, updates in-place   |
| `issue dispatch` | Reads EPIC checklist, creates one sub-issue per repo                                   |

## Key architectural rules

1. **Runtime is Bun only** — no Node.js, no npm. Use `bun install`, `bun test`, `bun run build.ts`.
2. **Single-file executable** — `Bun.build({ compile: true })` in `build.ts`.
3. **Metadata in HTML comments** — `<!-- github-issue-ops:metadata\n{JSON}\n-->` at end of issue body.
4. **Body limit = 65 000** — hard limit in `src/core/checklist.ts#BODY_LIMIT`. Overflow → `addComment`.
5. **No direct `fetch`** — always use `fetchWithRetry` from `src/api/api-utils.ts`.
6. **Tests co-located** — `*.test.ts` next to the file under test. Run with `bun test`.
7. **Signed commits** — `git commit -S -m "..."`. Never push via MCP tools.
8. **Linter = oxlint**, **formatter = oxfmt** — run `bun run lint` and `bun run format:check`.
