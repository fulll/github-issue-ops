# issue refresh

Refreshes an existing EPIC issue with updated results from stdin.
Computes a diff and updates the checklist in-place, preserving all manually checked items.

## Synopsis

```bash
<updated-results> | github-issue-ops issue refresh [options]
```

## Options

| Flag                              | Required | Description                                  |
| --------------------------------- | -------- | -------------------------------------------- |
| `-i, --issue <owner/repo#number>` | ✓        | EPIC issue reference                         |
| `--non-interactive`               |          | Skip confirmation prompt                     |
| `--dry-run`                       |          | Show updated body without patching the issue |

## Examples

```bash
github-code-search "TODO" --org acme | github-issue-ops issue refresh \
  --issue acme/platform#42
```

```bash
# Full URL also accepted
github-issue-ops issue refresh \
  --issue https://github.com/acme/platform/issues/42
```

## Diff behaviour

| Item state                     | Action                              |
| ------------------------------ | ----------------------------------- |
| Present in old, present in new | Preserved (keeps checked/unchecked) |
| Not in old, present in new     | Appended as `- [ ]` (unchecked)     |
| Present in old, not in new     | Marked as `- [x]` (checked-off)     |

Items are identified by the composite key `repo:path:line:text`.
