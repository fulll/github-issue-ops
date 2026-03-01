import { describe, expect, test, afterEach } from "bun:test";
import { findExistingDispatchIssue, buildDedupMap } from "./dedup.ts";

// ─── findExistingDispatchIssue ────────────────────────────────────────────────

describe("findExistingDispatchIssue", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns null when search finds no issues", async () => {
    globalThis.fetch = () =>
      Promise.resolve(new Response(JSON.stringify({ total_count: 0, items: [] }), { status: 200 }));

    const result = await findExistingDispatchIssue(
      "tok",
      "acme",
      "backend",
      "https://github.com/acme/platform/issues/1",
    );
    expect(result).toBeNull();
  });

  test("returns issue number when a matching issue is found", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            total_count: 1,
            items: [
              {
                number: 42,
                id: 1,
                title: "test",
                html_url: "https://github.com/acme/backend/issues/42",
                state: "open",
                body: "",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await findExistingDispatchIssue(
      "tok",
      "acme",
      "backend",
      "https://github.com/acme/platform/issues/1",
    );
    expect(result).toBe(42);
  });
});

// ─── buildDedupMap ────────────────────────────────────────────────────────────

describe("buildDedupMap", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("builds a map of repo → existing issue number", async () => {
    let callCount = 0;
    globalThis.fetch = () => {
      callCount++;
      // First repo has a match, second doesn't
      const items =
        callCount === 1
          ? [{ number: 7, id: 1, title: "", html_url: "", state: "open", body: "" }]
          : [];
      return Promise.resolve(
        new Response(JSON.stringify({ total_count: items.length, items }), { status: 200 }),
      );
    };

    const map = await buildDedupMap(
      "tok",
      "acme",
      ["repo-a", "repo-b"],
      "https://github.com/acme/platform/issues/1",
    );

    expect(map.get("acme/repo-a")).toBe(7);
    expect(map.get("acme/repo-b")).toBeNull();
  });
});
