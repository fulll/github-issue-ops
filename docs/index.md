---
layout: home

hero:
  name: "github-issue-ops"
  text: "Industrialize GitHub issue campaigns"
  tagline: From code-search results to EPIC issues and per-repo sub-issues in seconds.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/fulll/github-issue-ops

features:
  - title: Issue create
    icon:
      src: /github-issue-ops/icons/epic.svg
    details: Pipe <a href="https://fulll.github.io/github-code-search/">github-code-search</a> output to create a fully structured EPIC issue with a checklist, summary and embedded metadata.
    link: /reference/create
    linkText: Reference
  - title: Issue refresh
    icon:
      src: /github-issue-ops/icons/sync.svg
    details: Re-run the search and refresh the checklist automatically — new repos added, removed repos checked off.
    link: /reference/refresh
    linkText: Reference
  - title: Issue dispatch
    icon:
      src: /github-issue-ops/icons/dispatch.svg
    details: Split an EPIC into one sub-issue per repository with automatic assignee resolution via teams, CODEOWNERS or a JSON mapping.
    link: /reference/dispatch
    linkText: Reference
---

## Use cases

| Scenario                   | Workflow                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Tech-debt campaign**     | Search for deprecated API usages → `issue create` → assign to teams → `issue dispatch`                            |
| **Security patch rollout** | Search for vulnerable dependency → `issue create` → update results weekly with `issue refresh` → `issue dispatch` |
| **Compliance enforcement** | Search for missing licence headers → `issue create` → track progress via EPIC checklist                           |
| **Framework migration**    | Search for legacy import patterns → `issue create` → `issue dispatch` per team                                    |

Works with any search tool that produces Markdown or JSON: [github-code-search](https://fulll.github.io/github-code-search/), custom scripts, or AI-generated reports.

## Why github-issue-ops in the agentic AI age?

AI coding agents generate code at unprecedented speed — and with it, new technical debt, security gaps, and compliance issues land across dozens of repositories simultaneously.

Traditional issue triage doesn't scale: an agent can introduce a problem in 50 repos in the time it takes a human to open a single ticket.

`github-issue-ops` closes this loop. It turns a structured search result — produced by a human, a CI check, or an AI agent itself — into a traceable GitHub issue campaign:

- **Systematic**: every affected repository gets its own sub-issue, no repo is missed.
- **Idempotent**: run the same command twice, the campaign is not duplicated.
- **Refreshable**: as the agent fixes repos, `issue refresh` updates the EPIC in real time.
- **Auditable**: metadata is embedded in the issue body; the full replay command is always one click away.

In an agentic world, `github-issue-ops` is the missing link between "AI found a problem at scale" and "every team knows about it, owns it, and can close it".

## Used in production?

`github-issue-ops` is developed and used internally at [fulll](https://github.com/fulll) to drive organisation-wide refactoring and compliance campaigns across hundreds of repositories.
