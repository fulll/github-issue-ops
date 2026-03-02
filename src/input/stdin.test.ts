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

  test("falls back to markdown when explicit json format but invalid JSON", () => {
    // When format:'json' is forced but the content is markdown, fall back gracefully
    const md = "- [ ] `a/b` \u2014 `c.ts:1` \u2014 text";
    const result = parseResults(md, "json");
    // JSON.parse would throw for markdown content → fallback to markdown
    expect(result.items).toHaveLength(1);
  });
});

// ─── detectFormat (invalid JSON) ──────────────────────────────────────────────

describe("detectFormat (invalid JSON)", () => {
  test("returns markdown when content starts with [ but is not valid JSON", () => {
    expect(detectFormat("[not json")).toBe("markdown");
  });

  test("returns markdown when content starts with { but is not valid JSON", () => {
    expect(detectFormat("{broken:")).toBe("markdown");
  });
});

// ─── parseJson (Case 3 — github-code-search group format) ────────────────────

describe("parseJson (Case 3 — group format)", () => {
  test("parses group format with textMatches and segments", () => {
    const grouped = [
      {
        repoFullName: "org/backend",
        matches: [
          {
            path: "src/app.ts",
            textMatches: [
              {
                fragment: "context around the match",
                matches: [{ text: "matched text", indices: [0, 7] }],
              },
            ],
          },
        ],
      },
    ];
    const result = parseJson(JSON.stringify(grouped));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      repo: "org/backend",
      path: "src/app.ts",
      text: "matched text",
    });
  });

  test("parses group format with textMatches but no segments (uses fragment)", () => {
    const grouped = [
      {
        repoFullName: "org/repo",
        matches: [
          {
            path: "readme.md",
            textMatches: [{ fragment: "fragment text here", matches: [] }],
          },
        ],
      },
    ];
    const result = parseJson(JSON.stringify(grouped));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.text).toBe("fragment text here");
  });

  test("parses group format with matches array but no textMatches", () => {
    const grouped = [
      {
        repoFullName: "org/repo",
        matches: [{ path: "file.ts" }],
      },
    ];
    const result = parseJson(JSON.stringify(grouped));
    // No textMatches → one empty-text item per match
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ repo: "org/repo", path: "file.ts", text: "" });
  });

  test("returns empty items for empty JSON array", () => {
    const result = parseJson("[]");
    expect(result.items).toHaveLength(0);
  });
});

// ─── parseMarkdown (GCS native markdown format B) ───────────────────────────

describe("parseMarkdown (GCS native format B — bold repo header + indented items)", () => {
  const GCS_MD = `27 repos · 112 files · 154 matches selected

## squad-platform

- **fulll/backend** (3 matches)
  - [ ] [src/app/config.ts:8:63](https://github.com/fulll/backend/blob/abc123/src/app/config.ts#L8)
  - [x] [src/infra/secret.ts:3:41](https://github.com/fulll/backend/blob/abc123/src/infra/secret.ts#L3)

## squad-api

- **fulll/frontend** (1 match)
  - [ ] [app/index.ts:5:10](https://github.com/fulll/frontend/blob/def456/app/index.ts#L5)
`;

  test("parses all items", () => {
    const result = parseMarkdown(GCS_MD);
    expect(result.items).toHaveLength(3);
  });

  test("assigns repo from bold header", () => {
    const result = parseMarkdown(GCS_MD);
    expect(result.items[0]?.repo).toBe("fulll/backend");
    expect(result.items[1]?.repo).toBe("fulll/backend");
    expect(result.items[2]?.repo).toBe("fulll/frontend");
  });

  test("strips col number and extracts path + line", () => {
    const result = parseMarkdown(GCS_MD);
    expect(result.items[0]).toMatchObject({
      path: "src/app/config.ts",
      line: 8,
      checked: false,
    });
  });

  test("extracts checked state", () => {
    const result = parseMarkdown(GCS_MD);
    expect(result.items[1]?.checked).toBe(true);
    expect(result.items[2]?.checked).toBe(false);
  });

  test("path with no line/col keeps full string and line=0", () => {
    const md = `- **org/repo**\n  - [ ] [README.md](https://github.com/org/repo/blob/sha/README.md)\n`;
    const result = parseMarkdown(md);
    expect(result.items[0]).toMatchObject({ path: "README.md", line: 0 });
  });
});

// ─── parseMarkdown (no-line-number alternative) ───────────────────────────────

describe("parseMarkdown (alternative format without line number)", () => {
  test("parses checklist items without line numbers", () => {
    const md =
      "- [ ] `org/repo` \u2014 `src/config.ts` \u2014 missing\n- [x] `org/repo` \u2014 `src/app.ts` \u2014 fixed";
    const result = parseMarkdown(md);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      repo: "org/repo",
      path: "src/config.ts",
      line: 0,
      checked: false,
    });
    expect(result.items[1]).toMatchObject({
      repo: "org/repo",
      path: "src/app.ts",
      line: 0,
      checked: true,
    });
  });
});
