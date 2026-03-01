# issue create

Creates an EPIC issue in a GitHub repository from a structured result set piped on stdin.

## Synopsis

```bash
<results> | github-issue-ops issue create [options]
```

## Options

| Flag                      | Required                | Description                                            |
| ------------------------- | ----------------------- | ------------------------------------------------------ |
| `-r, --repo <owner/repo>` | ✓                       | Target repository for the EPIC issue                   |
| `-t, --title <title>`     | ✓ (interactive or flag) | Issue title                                            |
| `-l, --label <label>`     |                         | Label to apply — repeatable                            |
| `-a, --assignee <login>`  |                         | Assignee GitHub login — repeatable                     |
| `--template <name>`       |                         | Issue template filename (e.g. `epic.md`)               |
| `--team-prefix <prefix>`  |                         | Team name prefix for ownership resolution — repeatable |
| `--non-interactive`       |                         | Disable all interactive prompts                        |
| `--dry-run`               |                         | Print body without creating the issue                  |

## Examples

### Interactive mode

```bash
github-code-search "TODO" --org acme | github-issue-ops issue create --repo acme/platform
```

Prompts for title, labels, and template interactively.

### Non-interactive (CI)

```bash
cat results.md | github-issue-ops issue create \
  --repo acme/platform \
  --title "Q1: Address all TODOs" \
  --label epic \
  --non-interactive
```

### Dry run

```bash
cat results.json | github-issue-ops issue create \
  --repo acme/platform \
  --title "Preview" \
  --dry-run
```

## Input formats

Accepts two input formats auto-detected from stdin:

**Markdown** (github-code-search default output):

```markdown
- [ ] `acme/backend` — `src/utils.ts:12` — TODO: fix me

# Replay:

github-code-search "TODO" --org acme
```

**JSON** (flat array or github-code-search `--format json` output):

```json
[{ "repo": "acme/backend", "path": "src/utils.ts", "line": 12, "text": "TODO: fix me" }]
```
