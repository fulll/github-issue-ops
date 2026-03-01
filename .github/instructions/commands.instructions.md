---
applyTo: "src/commands/**"
---

# Command implementations

## Files

| File                       | Commander subcommand |
| -------------------------- | -------------------- |
| `src/commands/create.ts`   | `issue create`       |
| `src/commands/refresh.ts`  | `issue refresh`      |
| `src/commands/dispatch.ts` | `issue dispatch`     |

## Conventions

- Each command exports an `*Action(options)` async function called by the Commander `.action()` handler.
- `options` include a `token: string` injected from `getToken()` in the main entry point.
- Use `@clack/prompts` for all interactive UX: `p.intro`, `p.spinner`, `p.confirm`, `p.text`, `p.multiselect`, `p.outro`, `p.cancel`.
- `p.cancel()` then `process.exit(0)` for user-initiated aborts (not errors).
- `process.exit(1)` for errors; write the message to `process.stderr` with `pc.red("✘")` prefix.
- `--non-interactive` flag skips all prompts; required flags must then be provided via CLI.
- `--dry-run` runs the full logic but skips mutating API calls; prints the result body.

## Dispatch mode

- `--mode plan` (default): show the plan table, exit 0.
- `--mode apply`: run the plan after a confirmation prompt (skipped with `--non-interactive`).

## Error propagation

All command `*Action` functions throw on API errors. The entrypoint catches them via `.catch(exitOnError)`.
