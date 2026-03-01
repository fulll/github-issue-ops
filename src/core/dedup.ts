// ─── Deduplication helpers ────────────────────────────────────────────────────
//
// Prevents creating duplicate dispatch issues for a given EPIC.
// Strategy: search for open issues in the target repo whose body contains the
// EPIC issue URL and the `github-issue-ops` label.

import { searchIssues } from "../api/github-api.ts";

/**
 * Searches for an existing open dispatch issue for the given repo + epic URL.
 *
 * Query: `repo:{owner}/{repo} label:github-issue-ops in:body {epicUrl} is:open`
 *
 * Returns the issue number if found, null otherwise.
 */
export async function findExistingDispatchIssue(
  token: string,
  owner: string,
  repo: string,
  epicUrl: string,
): Promise<number | null> {
  const q = `repo:${owner}/${repo} label:github-issue-ops in:body ${epicUrl} is:open`;
  const issues = await searchIssues(token, q);
  if (issues.length === 0) return null;
  // Return the most recently created issue (search API returns best-match first)
  return issues[0]?.number ?? null;
}

/**
 * Builds a dedup map for a batch of repos.
 * Returns a map of `owner/repo` → existing issue number (or null if none found).
 * Runs searches sequentially to avoid overwhelming the search API rate-limits.
 */
export async function buildDedupMap(
  token: string,
  org: string,
  repos: string[],
  epicUrl: string,
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  for (const repoName of repos) {
    const key = `${org}/${repoName}`;
    const existing = await findExistingDispatchIssue(token, org, repoName, epicUrl);
    map.set(key, existing);
  }
  return map;
}
