# Getting started

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/fulll/github-issue-ops/main/install.sh | bash
```

Or download the latest binary from [GitHub Releases](https://github.com/fulll/github-issue-ops/releases).

## Prerequisites

- A GitHub personal access token with `repo` and `read:org` scopes.
- Export it as `GITHUB_TOKEN` (or `GH_TOKEN`):

```bash
export GITHUB_TOKEN=ghp_...
```

## Quickstart

### Create an EPIC issue

Pipe [github-code-search](https://github.com/fulll/github-code-search) output into `issue create`:

```bash
github-code-search "TODO" --org acme --format markdown \
  | github-issue-ops issue create \
    --repo acme/platform \
    --title "Q1 2025: Address all TODOs" \
    --label epic \
    --label tech-debt
```

### Refresh the EPIC after new results

```bash
github-code-search "TODO" --org acme --format markdown \
  | github-issue-ops issue refresh \
    --issue acme/platform#42
```

### Dispatch sub-issues per repository

```bash
# Preview what would happen
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode plan

# Create the issues
github-issue-ops issue dispatch \
  --epic acme/platform#42 \
  --mode apply
```
