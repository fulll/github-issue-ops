# Level 2: Containers

The containers are split across two focused diagrams to keep relations readable.
Each arrow has a single, clear crossing-free path.

## 2a — Command pipeline

How a command flows from `stdin` through parsing, core logic, and API calls to GitHub.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Poppins, Aestetico, Arial, sans-serif", "primaryColor": "#66CCFF", "primaryTextColor": "#000000", "lineColor": "#0000CC", "tertiaryColor": "#FFCC33"}, "themeCSS": ".label,.nodeLabel,.cluster-label > span{font-family:Poppins,Arial,sans-serif;letter-spacing:.2px} .cluster-label > span{font-weight:600;font-size:13px} .edgePath .path{stroke-width:2px}"}}%%
C4Container
  title Level 2a: Command pipeline

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")

  Person(user, "Developer", "Pipes stdin results,<br/>runs create / refresh / dispatch")
  System_Ext(github, "GitHub REST API", "Issues · Labels<br/>Templates · Search")

  System_Boundary(tool, "github-issue-ops") {
    Container(cli, "CLI parser", "TypeScript / Commander", "Parses subcommands & flags,<br/>orchestrates all flows<br/>github-issue-ops.ts")
    Container(input, "Input reader", "TypeScript", "Reads stdin, auto-detects<br/>format (json / markdown),<br/>parses results<br/>src/input/stdin.ts")
    Container(core, "Core engine", "TypeScript", "Checklist build / diff / apply,<br/>metadata embed / extract,<br/>body length guard<br/>src/core/checklist.ts · metadata.ts")
    Container(output, "Output formatter", "TypeScript", "Builds EPIC body,<br/>sub-issue body, plan table<br/>src/output/format.ts")
    Container(api, "API client", "TypeScript", "GitHub REST — create/update<br/>issues, list labels, templates,<br/>search issues<br/>src/api/")
  }

  Rel(user, cli, "Invokes", "argv / stdin")
  UpdateRelStyle(user, cli, $offsetX="15", $offsetY="-45")

  Rel(cli, input, "Read &<br/>parse stdin")
  UpdateRelStyle(cli, input, $offsetX="-35", $offsetY="-25")

  Rel(cli, core, "Build / diff /<br/>apply checklist")
  UpdateRelStyle(cli, core, $offsetX="-5", $offsetY="-25")

  Rel(cli, output, "Build<br/>issue body")
  UpdateRelStyle(cli, output, $offsetX="20", $offsetY="-25")

  Rel(cli, api, "Create / update<br/>issues & comments")
  UpdateRelStyle(cli, api, $offsetX="55", $offsetY="-25")

  Rel(api, github, "REST calls", "HTTPS")
  UpdateRelStyle(api, github, $offsetX="10", $offsetY="-35")

  UpdateElementStyle(user, $bgColor="#66CCFF", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(cli, $bgColor="#FFCC33", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(input, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(core, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(output, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(api, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(github, $bgColor="#FF9933", $borderColor="#0000CC", $fontColor="#000000")
```

## 2b — Resolution & identity layer

Supporting services: ownership resolution, dedup, interactive editor, self-upgrade.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Poppins, Aestetico, Arial, sans-serif", "primaryColor": "#66CCFF", "primaryTextColor": "#000000", "lineColor": "#0000CC", "tertiaryColor": "#FFCC33"}, "themeCSS": ".label,.nodeLabel,.cluster-label > span{font-family:Poppins,Arial,sans-serif;letter-spacing:.2px} .cluster-label > span{font-weight:600;font-size:13px} .edgePath .path{stroke-width:2px}"}}%%
C4Container
  title Level 2b: Resolution & identity layer

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")

  Person(user, "Developer", "Uses interactive<br/>editor, reads output")
  System_Ext(github, "GitHub REST API", "Teams · CODEOWNERS<br/>Search · Releases")

  System_Boundary(tool, "github-issue-ops") {
    Container(cli, "CLI parser", "TypeScript / Commander", "Orchestrates all flows<br/>github-issue-ops.ts")
    Container(ownership, "Ownership resolver", "TypeScript", "Pluggable chain:<br/>teams → CODEOWNERS → mapping → fallback<br/>src/core/ownership.ts")
    Container(dedup, "Dedup checker", "TypeScript", "Prevents duplicate<br/>dispatch issues per repo<br/>src/core/dedup.ts")
    Container(editor, "Editor", "TypeScript / $EDITOR", "Spawns $EDITOR on<br/>a tmp file for interactive<br/>body editing<br/>src/tui/editor.ts")
    Container(upgrade, "Upgrader", "TypeScript", "Self-replace binary<br/>from latest GitHub release<br/>src/upgrade.ts")
  }

  Rel(user, cli, "Invokes", "argv")
  UpdateRelStyle(user, cli, $offsetX="-68", $offsetY="-125")

  Rel(cli, ownership, "Resolve<br/>assignees")
  UpdateRelStyle(cli, ownership, $offsetX="10", $offsetY="-5")

  Rel(cli, dedup, "Check existing<br/>dispatch issues")
  UpdateRelStyle(cli, dedup, $offsetX="-30", $offsetY="-25")

  Rel(cli, editor, "Open body<br/>for editing")
  UpdateRelStyle(cli, editor, $offsetX="-25", $offsetY="-5")

  Rel(cli, upgrade, "upgrade<br/>subcommand")
  UpdateRelStyle(cli, upgrade, $offsetX="35", $offsetY="-5")

  Rel(ownership, github, "Teams &<br/>CODEOWNERS", "HTTPS")
  UpdateRelStyle(ownership, github, $offsetX="10", $offsetY="-35")

  Rel(dedup, github, "Search<br/>existing issues", "HTTPS")
  UpdateRelStyle(dedup, github, $offsetX="-60", $offsetY="-35")

  Rel(upgrade, github, "Fetch<br/>latest release", "HTTPS")
  UpdateRelStyle(upgrade, github, $offsetX="40", $offsetY="-35")

  UpdateElementStyle(user, $bgColor="#66CCFF", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(cli, $bgColor="#FFCC33", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(ownership, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(dedup, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(editor, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(upgrade, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(github, $bgColor="#FF9933", $borderColor="#0000CC", $fontColor="#000000")
```

## Container descriptions

| Container              | Source file(s)                           | Responsibility                                                                                                                                                                                                                        |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **CLI parser**         | `github-issue-ops.ts`                    | Entry point. Registers `issue create/refresh/dispatch` and `upgrade` Commander subcommands, resolves `GITHUB_TOKEN`, delegates to command modules.                                                                                    |
| **Input reader**       | `src/input/stdin.ts`                     | Reads all of stdin into a string, auto-detects format (JSON or Markdown), dispatches to `parseJson` or `parseMarkdown`. Returns a `ParsedResults` with items + optional replay command.                                               |
| **Core engine**        | `src/core/checklist.ts` · `metadata.ts`  | Pure functions. `buildChecklist` → Markdown; `parseChecklist` → items; `diffChecklist`/`applyDiff` → diff & update body; `buildSummaryBlock`/`updateSummaryBlock` → stats; `embedMetadata`/`extractMetadata` → HTML comment metadata. |
| **Output formatter**   | `src/output/format.ts`                   | Pure formatters. `buildEpicBody` → full EPIC Markdown; `buildSubIssueBody` → per-repo issue body; `buildPlanTable` → dispatch plan table; `splitBodyAtLimit` → handles GitHub 65 k body limit.                                        |
| **API client**         | `src/api/github-api.ts` · `api-utils.ts` | The only layer allowed to make network calls. Handles authentication, pagination (`paginatedFetch`), exponential-backoff retry (`fetchWithRetry`), and full GitHub issue/team/CODEOWNERS API.                                         |
| **Ownership resolver** | `src/core/ownership.ts`                  | Pluggable resolver chain: `teamsResolver` → `codeownersResolver` → `mappingResolver` → `fallbackResolver`. First resolver returning non-null wins.                                                                                    |
| **Dedup checker**      | `src/core/dedup.ts`                      | Searches GitHub issues to find an existing dispatch issue for a given repo + EPIC URL. Builds a `Map<repo, issueNumber                                                                                                                | null>` for batch checking before dispatch. |
| **Editor**             | `src/tui/editor.ts`                      | Resolves `$VISUAL` → `$EDITOR` → `vi`, writes content to a temp file, spawns the editor with `spawnSync`, reads the result. Used by `issue create --interactive`.                                                                     |
| **Upgrader**           | `src/upgrade.ts`                         | Compares current version against the latest GitHub release tag, downloads the matching binary asset for the current platform, and atomically replaces the running executable.                                                         |
