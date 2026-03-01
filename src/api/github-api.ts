// ─── GitHub REST API client ───────────────────────────────────────────────────
//
// All GitHub API interactions go through this module.
// Functions are pure async: no I/O beyond fetch, no CLI output.
// All functions use fetchWithRetry and paginatedFetch from api-utils.ts.

import { fetchWithRetry, paginatedFetch } from "./api-utils.ts";
import type { GitHubIssue, GitHubLabel, GitHubTeam, GitHubIssueTemplate } from "../types.ts";

const BASE = "https://api.github.com";
const ACCEPT = "application/vnd.github+json";
const API_VERSION = "2022-11-28";

function headers(token: string): Record<string, string> {
  return {
    Accept: ACCEPT,
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

async function throwApiError(res: Response, context?: string): Promise<never> {
  const ctx = context ? ` (${context})` : "";
  let apiMsg = "(no message)";
  try {
    const body = (await res.json()) as { message?: string };
    apiMsg = body.message ?? apiMsg;
  } catch {
    // ignore JSON parse errors
  }
  const resetHeader = res.headers.get("x-ratelimit-reset");
  if (
    res.status === 403 &&
    (res.headers.get("x-ratelimit-remaining") === "0" ||
      apiMsg.toLowerCase().includes("rate limit"))
  ) {
    let wait = "";
    if (resetHeader) {
      const resetMs = parseInt(resetHeader, 10) * 1_000 - Date.now();
      if (resetMs > 0) {
        const secs = Math.ceil(resetMs / 1_000);
        wait = ` Please retry in ${secs} second${secs !== 1 ? "s" : ""}.`;
      }
    }
    throw new Error(`GitHub API rate limit exceeded.${wait}`);
  }
  throw new Error(`GitHub API error ${res.status}${ctx}: ${apiMsg}`);
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export interface CreateIssueParams {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  params: CreateIssueParams,
): Promise<GitHubIssue> {
  const res = await fetchWithRetry(`${BASE}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, `POST /repos/${owner}/${repo}/issues`);
  return res.json() as Promise<GitHubIssue>;
}

export async function updateIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  params: Partial<CreateIssueParams & { state: "open" | "closed" }>,
): Promise<GitHubIssue> {
  const res = await fetchWithRetry(`${BASE}/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, `PATCH /repos/${owner}/${repo}/issues/${issueNumber}`);
  return res.json() as Promise<GitHubIssue>;
}

export async function getIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<GitHubIssue> {
  const res = await fetchWithRetry(`${BASE}/repos/${owner}/${repo}/issues/${issueNumber}`, {
    headers: headers(token),
  });
  if (!res.ok) await throwApiError(res, `GET /repos/${owner}/${repo}/issues/${issueNumber}`);
  return res.json() as Promise<GitHubIssue>;
}

export async function addComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<{ id: number; html_url: string }> {
  const res = await fetchWithRetry(
    `${BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok)
    await throwApiError(res, `POST /repos/${owner}/${repo}/issues/${issueNumber}/comments`);
  return res.json() as Promise<{ id: number; html_url: string }>;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function listLabels(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubLabel[]> {
  return paginatedFetch(
    (page) =>
      fetchWithRetry(`${BASE}/repos/${owner}/${repo}/labels?per_page=100&page=${page}`, {
        headers: headers(token),
      }).then(async (res) => {
        if (!res.ok) await throwApiError(res, `GET labels page ${page}`);
        return res.json() as Promise<GitHubLabel[]>;
      }),
    100,
  );
}

// ─── Issue templates ──────────────────────────────────────────────────────────

/**
 * Fetches issue templates from .github/ISSUE_TEMPLATE/ in the repo.
 * Returns an empty array if the directory does not exist.
 */
export async function listIssueTemplates(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubIssueTemplate[]> {
  const res = await fetchWithRetry(
    `${BASE}/repos/${owner}/${repo}/contents/.github/ISSUE_TEMPLATE`,
    { headers: headers(token) },
  );
  if (res.status === 404) return [];
  if (!res.ok) await throwApiError(res, "GET ISSUE_TEMPLATE directory");
  const entries = (await res.json()) as Array<{
    name: string;
    download_url: string;
    sha: string;
    type: string;
  }>;
  const mdFiles = entries.filter((e) => e.type === "file" && e.name.endsWith(".md"));
  return Promise.all(
    mdFiles.map(async (entry): Promise<GitHubIssueTemplate> => {
      const contentRes = await fetchWithRetry(entry.download_url, {});
      const content = await contentRes.text();
      return { name: entry.name.replace(/\.md$/, ""), content, sha: entry.sha };
    }),
  );
}

// ─── Teams ────────────────────────────────────────────────────────────────────

/**
 * Lists all teams in an organization, optionally filtered by name prefixes.
 * Uses paginatedFetch (100/page) and applies prefix filtering client-side.
 */
export async function listOrgTeams(
  token: string,
  org: string,
  prefixes?: string[],
): Promise<GitHubTeam[]> {
  const all = await paginatedFetch(
    (page) =>
      fetchWithRetry(`${BASE}/orgs/${org}/teams?per_page=100&page=${page}`, {
        headers: headers(token),
      }).then(async (res) => {
        if (!res.ok) await throwApiError(res, `GET /orgs/${org}/teams page ${page}`);
        return res.json() as Promise<GitHubTeam[]>;
      }),
    100,
  );
  if (!prefixes || prefixes.length === 0) return all;
  return all.filter((t) => prefixes.some((p) => t.slug.startsWith(p) || t.name.startsWith(p)));
}

/**
 * Returns team slugs that have repositories matching the given repo name.
 * Uses the team→repos endpoint to list repos per team.
 */
export async function getTeamsForRepo(
  token: string,
  org: string,
  repoName: string,
  teamSlugs: string[],
): Promise<string[]> {
  const matched: string[] = [];
  for (const slug of teamSlugs) {
    // List repos for the team (paginated)
    const repos = await paginatedFetch(
      (page) =>
        fetchWithRetry(`${BASE}/orgs/${org}/teams/${slug}/repos?per_page=100&page=${page}`, {
          headers: headers(token),
        }).then(async (res) => {
          if (res.status === 404) return [] as Array<{ name: string }>;
          if (!res.ok) await throwApiError(res, `GET /orgs/${org}/teams/${slug}/repos`);
          return res.json() as Promise<Array<{ name: string }>>;
        }),
      100,
    );
    if (repos.some((r) => r.name === repoName)) {
      matched.push(slug);
    }
  }
  return matched;
}

// ─── CODEOWNERS ───────────────────────────────────────────────────────────────

/**
 * Fetches the raw content of the CODEOWNERS file.
 * Tries locations: CODEOWNERS, .github/CODEOWNERS, docs/CODEOWNERS.
 * Returns null if not found in any location.
 */
export async function getCodeowners(
  token: string,
  owner: string,
  repo: string,
): Promise<string | null> {
  const paths = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
  for (const path of paths) {
    const res = await fetchWithRetry(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: { ...headers(token), Accept: "application/vnd.github.raw+json" },
    });
    if (res.status === 404) continue;
    if (!res.ok) await throwApiError(res, `GET ${path}`);
    return res.text();
  }
  return null;
}

// ─── Search issues ────────────────────────────────────────────────────────────

export async function searchIssues(token: string, q: string): Promise<GitHubIssue[]> {
  const encoded = encodeURIComponent(q);
  const res = await fetchWithRetry(`${BASE}/search/issues?q=${encoded}&per_page=20`, {
    headers: headers(token),
  });
  if (!res.ok) await throwApiError(res, "GET /search/issues");
  const data = (await res.json()) as { items: GitHubIssue[] };
  return data.items ?? [];
}

// ─── Sub-issues (GitHub Projects sub-issue relationship) ─────────────────────

/**
 * Creates a sub-issue link between a parent issue and a child issue.
 * Uses the GitHub REST API sub-issues endpoint (preview feature).
 * Silently ignores 404 (endpoint not available) rather than throwing.
 */
export async function createSubIssueLink(
  token: string,
  owner: string,
  repo: string,
  parentIssueNumber: number,
  subIssueId: number,
): Promise<void> {
  const res = await fetchWithRetry(
    `${BASE}/repos/${owner}/${repo}/issues/${parentIssueNumber}/sub_issues`,
    {
      method: "POST",
      headers: {
        ...headers(token),
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ sub_issue_id: subIssueId }),
    },
  );
  // 404 = endpoint not available in this GitHub instance; not a fatal error
  if (res.status === 404 || res.status === 422) {
    await res.body?.cancel();
    return;
  }
  if (!res.ok)
    await throwApiError(res, `POST sub_issues for ${owner}/${repo}#${parentIssueNumber}`);
  await res.body?.cancel();
}
