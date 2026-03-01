# How it works

`github-issue-ops` follows a three-step workflow:

## 1. Create an EPIC

```
stdin (github-code-search output or JSON)
         │
         ▼
   parseResults()          ← src/input/stdin.ts
         │
         ▼
   buildEpicBody()         ← src/output/format.ts
   embedMetadata()         ← src/core/metadata.ts
         │
         ▼
   createIssue()           ← src/api/github-api.ts
         │
         ▼
   GitHub Issue (EPIC)
```

The EPIC issue body contains:

- A **checklist** of all matched files — `- [ ] \`repo\` — \`path:line\` — text`
- A **summary block** with progress stats
- A hidden **metadata block** (HTML comment) storing config for future `refresh` / `dispatch` calls

## 2. Refresh

When you re-run the search with updated code:

```
stdin (updated results)
         │
         ▼
   diffChecklist()         ← src/core/checklist.ts
   ┌──────────────────┐
   │ added items      │  → appended unchecked
   │ removed items    │  → checked-off
   │ unchanged items  │  → preserved as-is
   └──────────────────┘
         │
         ▼
   updateIssue()           ← src/api/github-api.ts
```

## 3. Dispatch

```
EPIC issue body
         │
         ▼
   parseChecklist()        ← src/core/checklist.ts
   groupByRepo()           ← src/commands/dispatch.ts
         │
         ├─ for each repo
         │     resolveOwners()     ← src/core/ownership.ts
         │     findExistingIssue() ← src/core/dedup.ts
         │     createIssue()       ← src/api/github-api.ts
         │     createSubIssueLink()
         │
         ▼
   One sub-issue per repo
```

## Metadata

All state needed for `refresh` and `dispatch` is embedded in the EPIC body as an invisible HTML comment:

```html
<!-- github-issue-ops:metadata
{"version":1,"replayCommand":"...","createdAt":"...","config":{...}}
-->
```

This makes EPICs fully self-contained — no external database or config file needed.
