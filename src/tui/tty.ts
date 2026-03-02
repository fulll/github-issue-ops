// ─── TTY utilities ────────────────────────────────────────────────────────────
//
// When stdin is piped (e.g. `cat results.md | github-issue-ops issue create`),
// process.stdin is consumed by readStdin() and left at EOF.
// Interactive prompt libraries (clack, inquirer, etc.) all read from
// process.stdin, so they immediately receive EOF and exit silently.
//
// reopenStdinAsTty() replaces process.stdin with a fresh ReadStream opened
// on /dev/tty, restoring the interactive terminal connection so that prompts
// work normally even after piped input has been consumed.

import { ReadStream } from "node:tty";
import { openSync } from "node:fs";

/**
 * If stdin was piped (and therefore consumed), re-open /dev/tty and reassign
 * process.stdin so interactive prompts can still read from the terminal.
 * No-op on Windows or when stdin is already a TTY.
 */
export function reopenStdinAsTty(): void {
  // Already a live TTY — nothing to do
  if (process.stdin.isTTY) return;
  // /dev/tty is POSIX-only (macOS + Linux)
  if (process.platform === "win32") return;
  try {
    const fd = openSync("/dev/tty", "r+");
    const tty = new ReadStream(fd);
    // Mark the stream as a TTY so that clack (and other prompt libs) know they
    // are running in an interactive context and enable raw-mode input.
    (tty as unknown as Record<string, unknown>).isTTY = true;
    // @ts-expect-error — intentionally replacing the global stdin stream
    process.stdin = tty;
    process.stdin.resume();
  } catch {
    // /dev/tty unavailable (CI without terminal, container, etc.) — prompts
    // will still fail gracefully; caller should fall back to --non-interactive.
  }
}
