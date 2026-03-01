import { describe, expect, test } from "bun:test";
import { detectFormat, parseMarkdown, parseJson, parseResults } from "./stdin.ts";

// ─── detectFormat ─────────────────────────────────────────────────────────────

describe("detectFormat", () => {
  test("detects JSON array", () => {
    expect(detectFormat("[{}]")).toBe("json");
  });

  test("detects JSON object", () => {
    expect(detectFormat('{"items":[]}')).toBe("json");
  });

  test("returns markdown for non-JSON content", () => {
    expect(detectFormat("## Results\n\n- [ ] `repo` — `path:1` — text")).toBe("markdown");
  });
});

// ─── parseMarkdown ────────────────────────────────────────────────────────────

describe("parseMarkdown", () => {
  const MARKDOWN = `# Search results

- [ ] \`acme/backend\` — \`src/utils.ts:12\` — TODO: fix me
- [x] \`acme/frontend\` — \`app/index.ts:5\` — FIXME: old code
- [ ] \`acme/backend\` — \`src/config.ts:30\` — TODO: update

# Replay:
github-code-search "TODO" --org acme
`;

  test("parses checklist items", () => {
    const result = parseMarkdown(MARKDOWN);
    expect(result.items).toHaveLength(3);
  });

  test("extracts checked state", () => {
    const result = parseMarkdown(MARKDOWN);
    expect(result.items[0]?.checked).toBe(false);
    expect(result.items[1]?.checked).toBe(true);
  });

  test("extracts repo, path, line, text", () => {
    const result = parseMarkdown(MARKDOWN);
    const first = result.items[0]!;
    expect(first.repo).toBe("acme/backend");
    expect(first.path).toBe("src/utils.ts");
    expect(first.line).toBe(12);
    expect(first.text).toBe("TODO: fix me");
  });

  test("extracts replay command", () => {
    const result = parseMarkdown(MARKDOWN);
    expect(result.replayCommand).toBe('github-code-search "TODO" --org acme');
  });

  test("handles missing replay block gracefully", () => {
    const result = parseMarkdown("- [ ] `repo/name` — `file.ts:1` — text");
    expect(result.replayCommand).toBeUndefined();
  });
});

// ─── parseJson ────────────────────────────────────────────────────────────────

describe("parseJson", () => {
  test("parses flat SearchResult array", () => {
    const items = [
      { repo: "org/a", path: "a.ts", line: 1, text: "hello" },
      { repo: "org/b", path: "b.ts", line: 2, text: "world", checked: true },
    ];
    const result = parseJson(JSON.stringify(items));
    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.checked).toBe(true);
  });

  test("parses github-code-search group format", () => {
    const grouped = {
      items: [{ repo: "org/a", path: "x.ts", line: 1, text: "foo" }],
      replayCommand: "my-command",
    };
    const result = parseJson(JSON.stringify(grouped));
    expect(result.items).toHaveLength(1);
    expect(result.replayCommand).toBe("my-command");
  });
});

// ─── parseResults ──────────────────────────────────────────────────────────────

describe("parseResults", () => {
  test("auto-detects markdown format", () => {
    const md = "- [ ] `a/b` — `c.ts:1` — text";
    const result = parseResults(md);
    expect(result.items).toHaveLength(1);
  });

  test("auto-detects json format", () => {
    const json = JSON.stringify([{ repo: "x/y", path: "z.ts", line: 1, text: "hi" }]);
    const result = parseResults(json);
    expect(result.items).toHaveLength(1);
  });

  test("returns empty items for empty string", () => {
    const result = parseResults("");
    expect(result.items).toHaveLength(0);
  });
});
