# github-issue-ops

<img src="docs/public/logo.svg" alt="github-issue-ops logo" width="80" align="right">

[![Docs](https://img.shields.io/badge/docs-fulll.github.io%2Fgithub--issue--ops-blue)](https://fulll.github.io/github-issue-ops/)
[![Latest release](https://img.shields.io/github/v/release/fulll/github-issue-ops)](https://github.com/fulll/github-issue-ops/releases/latest)
[![CI](https://github.com/fulll/github-issue-ops/actions/workflows/ci.yaml/badge.svg)](https://github.com/fulll/github-issue-ops/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

CLI to industrialize GitHub issue campaigns (tech debt, security, migration, compliance) from code search results — create EPICs, refresh checklists, dispatch sub-issues per repo.

→ **Full documentation: https://fulll.github.io/github-issue-ops/**

## What it does

`github-issue-ops` takes the output of [`github-code-search`](https://github.com/fulll/github-code-search) (or any markdown/JSON input) and turns it into a structured GitHub issue campaign:

- **`issue create`** — create an EPIC issue in a central repo from stdin results
- **`issue refresh`** — re-run the search, diff results, update the checklist
- **`issue dispatch`** — create per-repo sub-issues from the EPIC

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- `GITHUB_TOKEN` environment variable with the required permissions

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/fulll/github-issue-ops/main/install.sh | bash
```

## Usage

```bash
# Create an EPIC from github-code-search results
github-code-search "TODO" --org myorg --no-interactive | \
  github-issue-ops issue create --repo myorg/tech-debt --title "TODO cleanup Q1"

# Refresh an existing EPIC
github-issue-ops issue refresh --epic myorg/tech-debt#42

# Dry-run dispatch (plan)
github-issue-ops issue dispatch --epic myorg/tech-debt#42 --mode plan

# Actually dispatch sub-issues
github-issue-ops issue dispatch --epic myorg/tech-debt#42 --mode apply

# Check for updates
github-issue-ops upgrade
```

## License

[MIT](LICENSE.md) — Copyright (c) 2026 Fulll
