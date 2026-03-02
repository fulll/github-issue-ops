# Quickstart

The typical workflow is three commands: **create**, **refresh**, **dispatch**.

## 1. Create an EPIC issue

Pipe [github-code-search](https://fulll.github.io/github-code-search/) output into `issue create`:

```bash
github-code-search "TODO" --org acme --format markdown \
  | github-issue-ops issue create \
    --repo acme/platform \
    --title "Q1 2025: Address all TODOs" \
    --label epic \
    --label tech-debt
```

This creates a single EPIC issue in `acme/platform` with:

- a **Markdown checklist** — one entry per matched repository,
- a **summary block** with progress stats,
- an embedded **metadata comment** so `refresh` and `dispatch` can replay the campaign automatically.

## 2. Refresh the checklist

Re-run the search and let `issue refresh` reconcile the diff:

```bash
github-code-search "TODO" --org acme --format markdown \
  | github-issue-ops issue refresh \
    --issue acme/platform#42
```

New repositories are **appended** as unchecked items. Repositories that no longer appear are **checked off** automatically.

## 3. Dispatch sub-issues

Preview first, then execute:

```bash
# Preview what would happen
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode plan

# Create the sub-issues
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode apply
```

One sub-issue is created per repository in the checklist. Assignees are resolved in order:

1. GitHub Teams (`--team-prefix`)
2. CODEOWNERS file in the repository
3. JSON mapping in a central repo (`--central-repo`)
4. Unassigned fallback

## Keep it up to date

```bash
github-issue-ops upgrade
```

See [What's New](/whats-new/) for the full changelog.

## Next steps

- [CLI Reference](/reference/create) — all options for each subcommand
- [Architecture](/architecture/overview) — how it works under the hood
