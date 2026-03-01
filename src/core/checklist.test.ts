import { describe, expect, test } from "bun:test";
import {
  buildChecklist,
  parseChecklist,
  diffChecklist,
  applyDiff,
  buildSummaryBlock,
  updateSummaryBlock,
  checkBodyLength,
  BODY_LIMIT,
} from "./checklist.ts";
import type { ChecklistItem } from "../types.ts";

const MOCK_ITEMS: ChecklistItem[] = [
  { checked: false, repo: "acme/backend", path: "src/utils.ts", line: 12, text: "TODO: fix me" },
  { checked: true, repo: "acme/frontend", path: "app/index.ts", line: 5, text: "FIXME: old code" },
  { checked: false, repo: "acme/backend", path: "src/config.ts", line: 30, text: "TODO: update" },
];

describe("buildChecklist", () => {
  test("produces markdown checklist lines", () => {
    const result = buildChecklist(MOCK_ITEMS);
    expect(result).toContain("- [ ] `acme/backend` — `src/utils.ts:12` — TODO: fix me");
    expect(result).toContain("- [x] `acme/frontend` — `app/index.ts:5` — FIXME: old code");
  });

  test("empty items returns empty string", () => {
    expect(buildChecklist([])).toBe("");
  });
});

describe("parseChecklist", () => {
  test("round-trips through buildChecklist", () => {
    const body = buildChecklist(MOCK_ITEMS);
    const parsed = parseChecklist(body);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      checked: false,
      repo: "acme/backend",
      path: "src/utils.ts",
      line: 12,
    });
    expect(parsed[1]).toMatchObject({
      checked: true,
      repo: "acme/frontend",
      path: "app/index.ts",
      line: 5,
    });
  });

  test("ignores non-checklist lines", () => {
    const body = "## Title\n\nSome text\n\n- [ ] `repo/name` — `file.ts:1` — hello\n\nMore text";
    const parsed = parseChecklist(body);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.repo).toBe("repo/name");
  });

  test("returns empty array for body without checklist", () => {
    expect(parseChecklist("## No checklist here")).toHaveLength(0);
  });
});

describe("diffChecklist", () => {
  const base: ChecklistItem[] = [
    { checked: false, repo: "org/a", path: "a.ts", line: 1, text: "alpha" },
    { checked: true, repo: "org/b", path: "b.ts", line: 2, text: "beta" },
  ];

  test("detects added items", () => {
    const next: ChecklistItem[] = [
      ...base,
      { checked: false, repo: "org/c", path: "c.ts", line: 3, text: "gamma" },
    ];
    const diff = diffChecklist(base, next);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.repo).toBe("org/c");
    expect(diff.removed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(2);
  });

  test("detects removed items", () => {
    const diff = diffChecklist(base, [base[0]!]);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.repo).toBe("org/b");
    expect(diff.added).toHaveLength(0);
  });

  test("empty to empty has no changes", () => {
    const diff = diffChecklist([], []);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });
});

describe("applyDiff", () => {
  test("appends added items and checks off removed items", () => {
    const base: ChecklistItem[] = [
      { checked: false, repo: "org/a", path: "a.ts", line: 1, text: "alpha" },
    ];
    const next: ChecklistItem[] = [
      { checked: false, repo: "org/b", path: "b.ts", line: 2, text: "beta" },
    ];
    const body = buildChecklist(base);
    const diff = diffChecklist(base, next);
    const updated = applyDiff(body, diff);
    expect(updated).toContain("- [x] `org/a`");
    expect(updated).toContain("- [ ] `org/b`");
  });
});

describe("buildSummaryBlock", () => {
  test("includes total, checked and repo counts", () => {
    const block = buildSummaryBlock({ total: 10, resolved: 3, added: 2 });
    expect(block).toContain("10");
    expect(block).toContain("3");
    expect(block).toContain("2");
  });
});

describe("parseChecklist (no-line-number variant)", () => {
  test("parses items without a line number", () => {
    const body =
      "- [ ] `org/repo` \u2014 `src/config.ts` \u2014 missing config\n- [x] `org/repo` \u2014 `src/app.ts` \u2014 fixed";
    const items = parseChecklist(body);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      checked: false,
      repo: "org/repo",
      path: "src/config.ts",
      line: 0,
      text: "missing config",
    });
    expect(items[1]).toMatchObject({
      checked: true,
      repo: "org/repo",
      path: "src/app.ts",
      line: 0,
      text: "fixed",
    });
  });
});

describe("applyDiff (no-line-number + empty-body edge cases)", () => {
  test("marks removed no-line-number items as checked", () => {
    // Build checklist with no line number
    const base: ChecklistItem[] = [
      { checked: false, repo: "org/a", path: "a.ts", line: 0, text: "old" },
    ];
    const body = `- [ ] \`org/a\` \u2014 \`a.ts\` \u2014 old`;
    const diff = diffChecklist(base, []);
    const updated = applyDiff(body, diff);
    expect(updated).toContain("- [x] `org/a`");
  });

  test("appends added items to body with no existing checklist", () => {
    const diff = diffChecklist(
      [],
      [{ checked: false, repo: "org/b", path: "b.ts", line: 1, text: "new" }],
    );
    const updated = applyDiff("## Title\n\nSome prose", diff);
    expect(updated).toContain("- [ ] `org/b`");
  });
});

describe("updateSummaryBlock", () => {
  test("replaces existing summary block", () => {
    const body = "## Checklist\n\n" + buildSummaryBlock({ total: 5, resolved: 0, added: 0 });
    const updated = updateSummaryBlock(body, { total: 5, resolved: 5, added: 0 });
    const count = (updated.match(/## Summary/g) ?? []).length;
    expect(count).toBe(1);
  });

  test("inserts summary block before metadata comment", () => {
    const meta = "<!-- github-issue-ops:metadata\n{}\n-->";
    const body = `## Checklist\n\n- [ ] \`r/a\` \u2014 \`f.ts:1\` \u2014 x\n\n${meta}`;
    const updated = updateSummaryBlock(body, { total: 1, resolved: 0, added: 0 });
    const metaPos = updated.indexOf("<!-- github-issue-ops:metadata");
    const summaryPos = updated.indexOf("## Summary");
    expect(summaryPos).toBeGreaterThan(-1);
    expect(summaryPos).toBeLessThan(metaPos);
  });

  test("appends summary block at end when no metadata comment", () => {
    const body = "## Checklist\n\n- [ ] `r/a` \u2014 `f.ts:1` \u2014 x";
    const updated = updateSummaryBlock(body, { total: 1, resolved: 0, added: 0 });
    expect(updated).toContain("## Summary");
    expect(updated.indexOf("## Summary")).toBeGreaterThan(updated.indexOf("## Checklist"));
  });
});

describe("checkBodyLength", () => {
  test("ok for short body", () => {
    expect(checkBodyLength("hello").ok).toBe(true);
  });

  test("not ok for body exceeding BODY_LIMIT", () => {
    const long = "x".repeat(BODY_LIMIT + 1);
    const result = checkBodyLength(long);
    expect(result.ok).toBe(false);
    expect(result.length).toBeGreaterThan(BODY_LIMIT);
  });
});
