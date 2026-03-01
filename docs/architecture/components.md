# Level 3: Components

The pure-function core is split into two focused diagrams: the **core data pipeline**
(input → checklist → metadata → output) and the **ownership resolver chain**.
Every component in the pipeline is side-effect-free and fully unit-tested.

## 3a — Core data pipeline

Pure functions that transform raw input into structured issue bodies.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Poppins, Aestetico, Arial, sans-serif", "primaryColor": "#66CCFF", "primaryTextColor": "#000000", "lineColor": "#0000CC", "tertiaryColor": "#FFCC33"}, "themeCSS": ".label,.nodeLabel,.cluster-label > span{font-family:Poppins,Arial,sans-serif;letter-spacing:.2px} .cluster-label > span{font-weight:600;font-size:13px} .edgePath .path{stroke-width:2px}"}}%%
C4Component
  title Level 3a: Core data pipeline

  UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")

  Container(cli, "CLI parser", "github-issue-ops.ts", "Orchestrates each command<br/>using pure-function core")

  Container_Boundary(core, "Pure-function core — no I/O") {
    Component(inputFn, "Input parser", "src/input/stdin.ts", "detectFormat()<br/>parseMarkdown()<br/>parseJson()<br/>parseResults()")
    Component(checklistFn, "Checklist engine", "src/core/checklist.ts", "buildChecklist()<br/>parseChecklist()<br/>diffChecklist()<br/>applyDiff()")
    Component(metaFn, "Metadata store", "src/core/metadata.ts", "embedMetadata()<br/>extractMetadata()<br/>updateMetadata()<br/>stripMetadata()")
    Component(outputFn, "Output formatter", "src/output/format.ts", "buildEpicBody()<br/>buildSubIssueBody()<br/>buildPlanTable()<br/>splitBodyAtLimit()")
  }

  Rel(cli, inputFn, "Parse<br/>stdin")
  UpdateRelStyle(cli, inputFn, $offsetX="-10", $offsetY="-17")

  Rel(cli, checklistFn, "Build / diff /<br/>apply checklist")
  UpdateRelStyle(cli, checklistFn, $offsetX="-45", $offsetY="-17")

  Rel(cli, metaFn, "Embed / extract<br/>metadata")
  UpdateRelStyle(cli, metaFn, $offsetX="-70", $offsetY="-17")

  Rel(cli, outputFn, "Format<br/>issue body")
  UpdateRelStyle(cli, outputFn, $offsetX="-105", $offsetY="-17")

  UpdateElementStyle(cli, $bgColor="#FFCC33", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(inputFn, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(checklistFn, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(metaFn, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(outputFn, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
```

## 3b — Ownership resolver chain

The pluggable resolver chain used by `resolveOwners()` to determine assignees per repository.
Each resolver is a pure async function; the first returning a non-null array wins.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Poppins, Aestetico, Arial, sans-serif", "primaryColor": "#66CCFF", "primaryTextColor": "#000000", "lineColor": "#0000CC", "tertiaryColor": "#FFCC33"}, "themeCSS": ".label,.nodeLabel,.cluster-label > span{font-family:Poppins,Arial,sans-serif;letter-spacing:.2px} .cluster-label > span{font-weight:600;font-size:13px} .edgePath .path{stroke-width:2px}"}}%%
C4Component
  title Level 3b: Ownership resolver chain

  UpdateLayoutConfig($c4ShapeInRow="5", $c4BoundaryInRow="1")

  Container(cli, "CLI parser", "dispatch command", "Calls resolveOwners()<br/>for each repo group")

  Container_Boundary(chain, "src/core/ownership.ts — resolver chain") {
    Component(teams, "Teams resolver", "teamsResolver", "Lists org teams filtered<br/>by configured prefixes;<br/>checks repo membership<br/>→ @org/team-slug[]")
    Component(codeowners, "CODEOWNERS resolver", "codeownersResolver", "Fetches CODEOWNERS file;<br/>parses catch-all rules<br/>(`*` or `/`)<br/>→ username[]")
    Component(mapping, "Mapping resolver", "mappingResolver", "Fetches owners.json from<br/>centralRepo; looks up<br/>repoFullName or repoName<br/>→ owner[]")
    Component(fallback, "Fallback resolver", "fallbackResolver", "Always returns []<br/>— guarantees the chain<br/>never returns null")
  }

  Rel(cli, teams, "1. Try<br/>teams")
  UpdateRelStyle(cli, teams, $offsetX="-1", $offsetY="-15")

  Rel(teams, codeowners, "null →<br/>next")
  UpdateRelStyle(teams, codeowners, $offsetX="-25", $offsetY="-15")

  Rel(codeowners, mapping, "null →<br/>next")
  UpdateRelStyle(codeowners, mapping, $offsetX="-25", $offsetY="-15")

  Rel(mapping, fallback, "null →<br/>next")
  UpdateRelStyle(mapping, fallback, $offsetX="-25", $offsetY="-15")

  UpdateElementStyle(cli, $bgColor="#FFCC33", $borderColor="#0000CC", $fontColor="#000000")
  UpdateElementStyle(teams, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(codeowners, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(mapping, $bgColor="#0000CC", $borderColor="#0000AA", $fontColor="#ffffff")
  UpdateElementStyle(fallback, $bgColor="#66CCFF", $borderColor="#0000CC", $fontColor="#000000")
```

## Component descriptions

| Component               | Source file             | Key exports                                                                                                                                                                                                                        |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input parser**        | `src/input/stdin.ts`    | `detectFormat()` — JSON or Markdown; `parseMarkdown()` — parses checklist + replay block; `parseJson()` — 3 formats: flat array, wrapper object, github-code-search groups.                                                        |
| **Checklist engine**    | `src/core/checklist.ts` | `buildChecklist()` — results → Markdown; `parseChecklist()` — Markdown → items; `diffChecklist()` — old vs new; `applyDiff()` — update body in-place; `BODY_LIMIT = 65_000`.                                                       |
| **Metadata store**      | `src/core/metadata.ts`  | `embedMetadata()` — appends `<!-- github-issue-ops:metadata … -->` block; `extractMetadata()` — parses it back; `updateMetadata()` — updates a field; `stripMetadata()` — removes the comment.                                     |
| **Output formatter**    | `src/output/format.ts`  | `buildEpicBody()` — full EPIC Markdown with checklist + summary; `buildSubIssueBody()` — per-repo issue body listing files; `buildPlanTable()` — dispatch plan as ASCII table; `splitBodyAtLimit()` — splits body at `BODY_LIMIT`. |
| **Teams resolver**      | `src/core/ownership.ts` | Lists all org teams matching `teamPrefixes`, then checks which have the target repo. Returns `["@org/team"]` slugs or `null`.                                                                                                      |
| **CODEOWNERS resolver** | `src/core/ownership.ts` | Fetches `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`. Parses only catch-all rules (`*` or `/` patterns). Returns usernames or `null`.                                                                                     |
| **Mapping resolver**    | `src/core/ownership.ts` | Fetches `.github-issue-ops/owners.json` from `centralRepo`. Looks up `repoFullName` then `repoName`. Returns owners or `null`.                                                                                                     |
| **Fallback resolver**   | `src/core/ownership.ts` | Always returns `[]`. Ensures `resolveOwners()` never returns `null`.                                                                                                                                                               |

## Design principles

- **No I/O.** Every component in the core and output layers is a pure function: given the same inputs it always returns the same outputs. This makes them straightforward to test with Bun's built-in test runner.
- **Single responsibility.** Each module owns exactly one concern (parsing, checklist, metadata, …). The CLI parser composes them at command time rather than duplicating logic.
- **`types.ts` as the contract.** All components share interfaces from `src/types.ts` (`SearchResult`, `ParsedResults`, `ChecklistItem`, `DiffResult`, `EpicMetadata`, `DispatchGroup`, `OwnershipResolver`, …).
- **Body limit protected.** `BODY_LIMIT = 65_000` is a hard constant used by every body-building function. `splitBodyAtLimit()` and `checkBodyLength()` are the enforcement points.
