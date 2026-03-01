---
applyTo: "src/api/**"
---

# GitHub API layer

## Files

- `src/api/api-utils.ts` — `fetchWithRetry`, `paginatedFetch`, `formatRetryWait`
- `src/api/github-api.ts` — typed wrappers for all GitHub REST endpoints used

## Rules

- **Always** use `fetchWithRetry` — never call `fetch(...)` directly in API functions.
- **Always** use `paginatedFetch` for endpoints that are paginated (labels, teams, issues search).
- Errors must be thrown as plain `Error` using `throwApiError`; preserve HTTP status in the message.
- Set `X-GitHub-Api-Version: 2022-11-28` on every request.
- Authentication: `Authorization: Bearer ${token}`.
- `createSubIssueLink` silently ignores 404/422 — the sub-issues API is not universally available.

## Adding a new endpoint

1. Add a typed function in `github-api.ts`.
2. Use `fetchWithRetry` for single-page responses, `paginatedFetch` for lists.
3. Add the corresponding type to `src/types.ts` if a new shape is returned.
4. Write a test that mocks `globalThis.fetch`.
