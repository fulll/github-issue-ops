// ─── Shared interfaces ────────────────────────────────────────────────────────
// This file is the single source of truth for all shared TypeScript types.
// All new interfaces must be added here.

// ─── Search results (from github-code-search output) ─────────────────────────

/** One matched item from a github-code-search result. */
export interface SearchResult {
  /** Full repo name, e.g. "myorg/my-repo" */
  repo: string;
  /** File path within the repo, e.g. "src/foo.ts" */
  path: string;
  /** 1-based line number, or 0 if not available */
  line: number;
  /** Matched text snippet */
  text: string;
  /** Match type: TODO, FIXME, HACK, etc. — inferred from input */
  matchType?: string;
  /** Whether this item has been checked off (resolved) */
  checked?: boolean;
}

/** Parsed results from stdin (output of github-code-search). */
export interface ParsedResults {
  items: SearchResult[];
  /** The replay command found in the input (if any). */
  replayCommand?: string;
  /** The original query string (if extractable). */
  query?: string;
  /** The organization (if extractable). */
  org?: string;
}

// ─── EPIC metadata ────────────────────────────────────────────────────────────

/** Configuration passed at issue create time, stored in metadata. */
export interface EpicConfig {
  repo: string;
  template?: string;
  labels?: string[];
  assignees?: string[];
  teamPrefixes?: string[];
  /** Repo containing .github-issue-ops/owners.json (e.g. `fulll/platform`). */
  centralRepo?: string;
}

/** Machine-readable metadata stored as an HTML comment in the EPIC body. */
export interface EpicMetadata {
  /** Schema version — increment on breaking changes. */
  version: 1;
  /** The replay command to re-run the search (e.g. `github-code-search "TODO" --org myorg ...`). */
  replayCommand: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Original config used to create the EPIC. */
  config: EpicConfig;
}

// ─── Checklist ────────────────────────────────────────────────────────────────

/** One parsed item from a Markdown checklist in an issue body. */
export interface ChecklistItem {
  checked: boolean;
  repo: string;
  path: string;
  line: number;
  text: string;
}

/** Result of comparing two checklist snapshots. */
export interface DiffResult {
  added: ChecklistItem[];
  removed: ChecklistItem[];
  unchanged: ChecklistItem[];
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/** A group of checklist items to dispatch as a single sub-issue in one repo. */
export interface DispatchGroup {
  /** Full repo name, e.g. "myorg/my-repo" */
  repo: string;
  items: ChecklistItem[];
  assignees: string[];
  labels: string[];
}

/** Status of a dispatch group after dedup check. */
export type DispatchStatus = "create" | "exists" | "error";

/** Enriched dispatch group with resolved ownership + dedup status. */
export interface ResolvedDispatchGroup extends DispatchGroup {
  status: DispatchStatus;
  existingIssueNumber?: number;
  errorMessage?: string;
}

// ─── Ownership ────────────────────────────────────────────────────────────────

/** Context passed to each ownership resolver. */
export interface OwnershipContext {
  token: string;
  org: string;
  /** Short repo name (without org prefix), e.g. "my-repo" */
  repoName: string;
  /** Full repo name, e.g. "myorg/my-repo" */
  repoFullName: string;
  items: ChecklistItem[];
  /** Team name prefixes to match (e.g. ["squad-", "chapter-"]). */
  teamPrefixes?: string[];
  /** Path to the owners mapping config file in the central repo. */
  centralRepo?: string;
}

// ─── GitHub API types ─────────────────────────────────────────────────────────

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
}

export interface GitHubTeam {
  slug: string;
  name: string;
  description?: string;
}

export interface GitHubIssueTemplate {
  name: string;
  /** Raw Markdown content of the template file. */
  content: string;
  /** SHA of the file (used for updates). */
  sha?: string;
}
