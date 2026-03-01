# Level 1: System context

`github-issue-ops` is a self-contained command-line tool. It mediates between
a developer and the GitHub REST API: the developer pipes code-search results
to the tool, which creates a structured **EPIC** issue in a central repository,
then dispatches one sub-issue per repository found.

The diagram below shows the two actors and the single external dependency.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Poppins, Aestetico, Arial, sans-serif", "primaryColor": "#66CCFF", "primaryTextColor": "#000000", "lineColor": "#0000CC", "tertiaryColor": "#FFCC33"}, "themeCSS": ".label,.nodeLabel,.cluster-label > span{font-family:Poppins,Arial,sans-serif;letter-spacing:.2px} .cluster-label > span{font-weight:600;font-size:13px} .edgePath .path{stroke-width:2px}"}}%%
C4Context
  title Level 1: github-issue-ops — System Context

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")

  Person(user, "Developer", "Pipes code-search results<br/>to github-issue-ops;<br/>runs from terminal or CI")

  Enterprise_Boundary(fulll, "fulll") {
    System(cli, "github-issue-ops", "CLI — creates EPIC issues<br/>with checklists, refreshes<br/>them, dispatches sub-issues<br/>per repository")
  }

  System_Ext(github, "GitHub REST API", "Issues · Teams<br/>CODEOWNERS · Labels<br/>Templates · Search")

  Rel(user, cli, "Pipes results,<br/>runs commands", "stdin / argv")
  UpdateRelStyle(user, cli, $offsetX="10", $offsetY="-55")

  Rel(cli, github, "Creates/updates issues,<br/>reads teams & CODEOWNERS", "HTTPS")
  UpdateRelStyle(cli, github, $offsetX="10", $offsetY="-30")

  UpdateElementStyle(user, $bgColor="#66CCFF", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(cli, $bgColor="#FFCC33", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(github, $bgColor="#FF9933", $borderColor="#0000CC", $fontColor="#000000")
```

## Actors

| Actor               | Description                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Developer**       | The person (or CI job) that invokes the tool. Provides a `GITHUB_TOKEN` and pipes `github-code-search` output to stdin.   |
| **GitHub REST API** | The only external system. Used for issue CRUD, labels, templates, org-team listing, CODEOWNERS, and issue search (dedup). |

## Authentication

The tool reads `GITHUB_TOKEN` (or `GH_TOKEN`) from the environment. The recommended OAuth scopes are:

- `repo` — read/write issues and repository contents (CODEOWNERS)
- `read:org` — org team listing (required for `--team-prefixes` ownership)
