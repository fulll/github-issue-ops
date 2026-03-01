---
applyTo: "src/core/**"
---

# Core business logic

## Files

| File                    | Responsibility                                                     |
| ----------------------- | ------------------------------------------------------------------ |
| `src/core/checklist.ts` | Build/parse/diff GitHub-markdown checklists; `BODY_LIMIT = 65_000` |
| `src/core/metadata.ts`  | Embed/extract/update HTML-comment metadata blocks                  |
| `src/core/ownership.ts` | Resolver chain: teams → CODEOWNERS → JSON mapping → fallback `[]`  |
| `src/core/dedup.ts`     | Search for pre-existing dispatch issues to avoid duplicates        |

## Metadata format

```
<!-- github-issue-ops:metadata
{"version":1,"replayCommand":"...","createdAt":"...","config":{...}}
-->
```

- `version: 1` — increment on breaking changes; add a migration in `extractMetadata`.
- Never display this block to end users — use `stripMetadata` before showing body text.

## Checklist format

Each item: `- [ ] \`owner/repo\` — \`path/to/file.ts:42\` — matched text`

Key function for the item identity key (used in diff): `repo:path:line:text`.

## Body limit

`BODY_LIMIT = 65_000` chars (GitHub's actual limit is 65 536). The `checkBodyLength` function returns `{ok, length, limit}`. When `!ok`:

- `issue create` → hard error; user must reduce input or edit body
- `issue refresh` → truncate + `addComment` with overflow

## Ownership resolver chain

Each resolver is `async (ctx: OwnershipContext) => string[] | null`.  
The chain stops on the first non-null result. The fallback resolver always returns `[]`.

To add a resolver, implement `OwnershipResolver` and insert it before `fallbackResolver` in `defaultResolverChain`.
