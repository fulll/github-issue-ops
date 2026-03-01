# issue dispatch

Creates one sub-issue per repository found in an EPIC's checklist.
Resolves assignees automatically via teams, CODEOWNERS, or a JSON mapping file.

## Synopsis

```bash
github-issue-ops issue dispatch [options]
```

## Options

| Flag                             | Required | Description                                                    |
| -------------------------------- | -------- | -------------------------------------------------------------- |
| `-e, --epic <owner/repo#number>` | ✓        | EPIC issue reference                                           |
| `-m, --mode <plan\|apply>`       |          | `plan` = show table; `apply` = create issues (default: `plan`) |
| `-l, --label <label>`            |          | Extra label to apply to each sub-issue — repeatable            |
| `--team-prefix <prefix>`         |          | Team name prefix for ownership resolution — repeatable         |
| `--central-repo <owner/repo>`    |          | Repo containing `.github-issue-ops/owners.json`                |
| `--non-interactive`              |          | Skip confirmation prompt in `apply` mode                       |

## Examples

### Preview the plan

```bash
github-issue-ops issue dispatch --epic acme/platform#42 --mode plan
```

Output:

```
Repo                                      Items    Assignees                       Action
────────────────────────────────────────────────────────────────────────────────────────
acme/backend                              12       acme/team-backend               create
acme/frontend                             5        acme/team-frontend              create
acme/infra                                3        (none)                          create
```

### Create all sub-issues

```bash
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode apply \
  --label github-issue-ops
```

### Ownership resolution order

1. **Teams** — GitHub org teams matching `--team-prefix` (or `teamPrefixes` from EPIC metadata)
2. **CODEOWNERS** — catch-all rules (`*` or `/`) in the repo's CODEOWNERS file
3. **JSON mapping** — `.github-issue-ops/owners.json` in `--central-repo`
4. **Fallback** — no assignees

### Deduplication

If an open issue already has the EPIC URL in its body and the `github-issue-ops` label, `dispatch` updates it instead of creating a duplicate.
