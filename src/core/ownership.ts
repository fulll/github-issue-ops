// ─── Ownership resolver chain ─────────────────────────────────────────────────
//
// Pluggable resolver chain: first resolver that returns a non-null, non-empty
// array of assignees wins. Each resolver is a pure async function.
//
// Default chain:
//   1. teamsResolver  — GitHub org teams filtered by configurable prefixes
//   2. codeownersResolver — parsed CODEOWNERS file
//   3. mappingResolver — JSON mapping file in the central repo
//   4. fallbackResolver — always returns []

import { listOrgTeams, getTeamsForRepo, getCodeowners } from "../api/github-api.ts";
import type { OwnershipContext } from "../types.ts";

// ─── Resolver type ────────────────────────────────────────────────────────────

/**
 * A resolver takes an OwnershipContext and returns either:
 * - An array of assignee strings (GitHub usernames or team slugs) → chain stops
 * - null → chain continues to the next resolver
 */
export type OwnershipResolver = (ctx: OwnershipContext) => Promise<string[] | null>;

// ─── Teams resolver ───────────────────────────────────────────────────────────

/**
 * Resolves ownership via GitHub organization teams.
 * Steps:
 *   1. Lists all org teams matching the configured prefixes.
 *   2. For each matching team, checks if the repo is in the team's repo list.
 *   3. Returns the slugs of matching teams (formatted as `@org/team-slug`).
 */
export const teamsResolver: OwnershipResolver = async (ctx) => {
  if (!ctx.teamPrefixes || ctx.teamPrefixes.length === 0) return null;

  const teams = await listOrgTeams(ctx.token, ctx.org, ctx.teamPrefixes);
  if (teams.length === 0) return null;

  const teamSlugs = teams.map((t) => t.slug);
  const matched = await getTeamsForRepo(ctx.token, ctx.org, ctx.repoName, teamSlugs);
  if (matched.length === 0) return null;

  return matched.map((slug) => `${ctx.org}/${slug}`);
};

// ─── CODEOWNERS resolver ──────────────────────────────────────────────────────

/**
 * Resolves ownership by fetching and parsing the CODEOWNERS file.
 * Only looks at catch-all rules: `*` or `/`.
 * Returns GitHub usernames (strips `@` prefix from entries).
 */
const codeownersResolver: OwnershipResolver = async (ctx) => {
  const [owner] = ctx.repoFullName.split("/");
  const raw = await getCodeowners(ctx.token, owner ?? ctx.org, ctx.repoName);
  if (!raw) return null;

  const owners: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;
    // Match catch-all rules: `* @user @team` or `/ @user @team`
    const match = trimmed.match(/^[*/]\s+(.*)/);
    if (match) {
      const entries = match[1].split(/\s+/).map((e) => e.replace(/^@/, ""));
      owners.push(...entries);
    }
  }

  return owners.length > 0 ? owners : null;
};

// ─── Mapping resolver ─────────────────────────────────────────────────────────

/**
 * Resolves ownership via a JSON mapping file in the central repo.
 * Expected file: `.github-issue-ops/owners.json` in the central repo.
 * Format: `{ "myorg/my-repo": ["user1", "user2"], ... }`
 */
const mappingResolver: OwnershipResolver = async (ctx) => {
  if (!ctx.centralRepo) return null;

  const [centralOwner, centralRepoName] = ctx.centralRepo.split("/");
  if (!centralOwner || !centralRepoName) return null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${centralOwner}/${centralRepoName}/contents/.github-issue-ops/owners.json`,
      {
        headers: {
          Accept: "application/vnd.github.raw+json",
          Authorization: `Bearer ${ctx.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) return null;
    const mapping = (await res.json()) as Record<string, string[]>;
    const owners = mapping[ctx.repoFullName] ?? mapping[ctx.repoName];
    return owners && owners.length > 0 ? owners : null;
  } catch {
    return null;
  }
};

// ─── Fallback resolver ────────────────────────────────────────────────────────

/**
 * Always returns an empty array (no assignees).
 * This ensures the chain never returns null.
 */
export const fallbackResolver: OwnershipResolver = async () => [];

// ─── Default chain ────────────────────────────────────────────────────────────

export const defaultResolverChain: OwnershipResolver[] = [
  teamsResolver,
  codeownersResolver,
  mappingResolver,
  fallbackResolver,
];

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Runs each resolver in the chain until one returns a non-null result.
 * The fallback resolver guarantees a return value.
 */
export async function resolveOwners(
  ctx: OwnershipContext,
  chain: OwnershipResolver[] = defaultResolverChain,
): Promise<string[]> {
  for (const resolver of chain) {
    const result = await resolver(ctx);
    if (result !== null) return result;
  }
  return [];
}
