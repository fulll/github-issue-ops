// ─── EPIC metadata — embed / extract ──────────────────────────────────────────
//
// Stores machine-readable metadata in a trailing HTML comment in the issue body.
// The comment is invisible in GitHub's Markdown rendering but readable via API.
//
// Format:
//   <!-- github-issue-ops:metadata
//   {"version":1,"replayCommand":"...","createdAt":"...","config":{...}}
//   -->

import type { EpicMetadata } from "../types.ts";

const METADATA_START = "<!-- github-issue-ops:metadata";
const METADATA_END = "-->";

// ─── Embed ────────────────────────────────────────────────────────────────────

/**
 * Appends (or replaces) the metadata HTML comment at the end of `body`.
 * If a metadata block already exists, it is replaced in-place.
 */
export function embedMetadata(body: string, meta: EpicMetadata): string {
  const block = `${METADATA_START}\n${JSON.stringify(meta)}\n${METADATA_END}`;
  const existing = body.indexOf(METADATA_START);
  if (existing !== -1) {
    const end = body.indexOf(METADATA_END, existing);
    if (end !== -1) {
      return body.slice(0, existing).trimEnd() + "\n\n" + block;
    }
  }
  return body.trimEnd() + "\n\n" + block;
}

// ─── Extract ──────────────────────────────────────────────────────────────────

/**
 * Extracts and parses the metadata JSON from the HTML comment in `body`.
 * Returns null if no metadata block is found or parsing fails.
 */
export function extractMetadata(body: string): EpicMetadata | null {
  const start = body.indexOf(METADATA_START);
  if (start === -1) return null;
  const end = body.indexOf(METADATA_END, start + METADATA_START.length);
  if (end === -1) return null;
  const json = body.slice(start + METADATA_START.length, end).trim();
  try {
    return JSON.parse(json) as EpicMetadata;
  } catch {
    return null;
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates specific fields in the existing metadata block.
 * If no metadata block exists, creates one from the supplied patch
 * (caller must supply at least the required fields).
 */
export function updateMetadata(body: string, patch: Partial<EpicMetadata>): string {
  const existing = extractMetadata(body);
  if (!existing) {
    // Cannot create a valid metadata block from a partial patch alone
    return body;
  }
  const updated: EpicMetadata = { ...existing, ...patch } as EpicMetadata;
  return embedMetadata(body, updated);
}

// ─── Strip ────────────────────────────────────────────────────────────────────

/**
 * Returns the body without the trailing metadata comment.
 * Useful for displaying the body to the user without the raw JSON.
 */
export function stripMetadata(body: string): string {
  const start = body.indexOf(METADATA_START);
  if (start === -1) return body;
  return body.slice(0, start).trimEnd();
}
