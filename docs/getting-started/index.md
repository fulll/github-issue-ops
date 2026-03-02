# Getting started

## Prerequisites

- **Bun** or a POSIX shell to run the installer (Bun is only required if you build from source).
- A GitHub personal access token with `repo` and `read:org` scopes:

```bash
export GITHUB_TOKEN=ghp_...
```

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/fulll/github-issue-ops/main/install.sh | bash
```

Or download the pre-built binary for your platform from [GitHub Releases](https://github.com/fulll/github-issue-ops/releases), then make it executable:

```bash
chmod +x github-issue-ops
mv github-issue-ops /usr/local/bin/
```

Verify the installation:

```bash
github-issue-ops --version
```

## Quickstart

The typical workflow is three commands: **create**, **refresh**, **dispatch**.

### 1. Create an EPIC issue

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

- a Markdown checklist, one entry per matched repository,
- a summary table,
- embedded metadata so `refresh` and `dispatch` can replay the campaign.

### 2. Refresh the checklist

Re-run the search and let `issue refresh` reconcile the diff:

```bash
github-code-search "TODO" --org acme --format markdown \
  | github-issue-ops issue refresh \
    --issue acme/platform#42
```

New repositories are appended; repositories that no longer appear are checked off automatically.

### 3. Dispatch sub-issues

Preview first, then execute:

```bash
# Preview
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode plan

# Execute
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode apply
```

One sub-issue is created per repository in the checklist. Assignees are resolved in order: GitHub Teams → CODEOWNERS → JSON mapping → fallback.

## Keep it up to date

```bash
github-issue-ops upgrade
```

See [What's New](/whats-new/) for the full changelog.
