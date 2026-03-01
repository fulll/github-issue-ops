// ─── $EDITOR helper ───────────────────────────────────────────────────────────
//
// Opens the user's preferred editor (from $EDITOR / $VISUAL env, fallback vi)
// on a temporary file pre-populated with `initialContent`, waits for the editor
// to exit, then reads the file back and returns the edited content.
//
// This mirrors how `git commit` opens commit messages in the user's editor.

import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";

/**
 * Opens the configured `$EDITOR` (falling back to `vi`) with the given content.
 * Blocks until the editor process exits.
 *
 * @param initialContent - Initial text to pre-populate in the editor.
 * @param suffix - File suffix hint (default `.md`). Some editors use it for syntax highlighting.
 * @returns The edited content as a string.
 * @throws If the editor exits with a non-zero status or spawning fails.
 */
export function openEditor(initialContent: string, suffix = ".md"): string {
  const editor = resolveEditor();
  const tmpFile = join(tmpdir(), `github-issue-ops-${Date.now()}${suffix}`);

  try {
    writeFileSync(tmpFile, initialContent, "utf8");

    const result = spawnSync(editor, [tmpFile], {
      stdio: "inherit",
      // Shell mode is required when $EDITOR contains flags (e.g. `code --wait`)
      shell: true,
    });

    if (result.error) {
      throw new Error(`Failed to launch editor "${editor}": ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`Editor "${editor}" exited with status ${result.status ?? "unknown"}.`);
    }

    return readFileSync(tmpFile, "utf8");
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Returns the editor command to use, in priority order:
 *   1. `$VISUAL` (preferred by POSIX for full-screen editors)
 *   2. `$EDITOR` (traditional POSIX editor variable)
 *   3. `vi` (universal fallback)
 */
export function resolveEditor(): string {
  return process.env["VISUAL"] ?? process.env["EDITOR"] ?? "vi";
}
