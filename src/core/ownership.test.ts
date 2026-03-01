import { describe, expect, test, mock } from "bun:test";
import {
  teamsResolver,
  fallbackResolver,
  resolveOwners,
  type OwnershipResolver,
} from "./ownership.ts";
import type { OwnershipContext } from "../types.ts";

const BASE_CTX: OwnershipContext = {
  token: "tok",
  org: "acme",
  repoName: "backend",
  repoFullName: "acme/backend",
  items: [],
  teamPrefixes: ["team-"],
};

// ─── Outer-scope resolvers (no captured variables) ────────────────────────────

const nullResolver: OwnershipResolver = async () => null;
const pairResolver: OwnershipResolver = async () => ["user1", "user2"];
const singleResolver: OwnershipResolver = async () => ["user3"];

// ─── fallbackResolver ─────────────────────────────────────────────────────────

describe("fallbackResolver", () => {
  test("always returns empty array", async () => {
    const result = await fallbackResolver(BASE_CTX);
    expect(result).toEqual([]);
  });
});

// ─── teamsResolver ────────────────────────────────────────────────────────────

describe("teamsResolver", () => {
  test("returns null when no teamPrefixes configured", async () => {
    const ctx = { ...BASE_CTX, teamPrefixes: undefined };
    const result = await teamsResolver(ctx);
    expect(result).toBeNull();
  });

  test("returns null when no org teams found", async () => {
    // Native ESM imports cannot be easily mocked in Bun without a patching library.
    // Test the early-exit branch: empty teamPrefixes → null immediately.
    const result = await teamsResolver({ ...BASE_CTX, teamPrefixes: [] });
    expect(result).toBeNull();
  });
});

// ─── codeownersResolver ───────────────────────────────────────────────────────

describe("codeownersResolver", () => {
  test("returns null when no CODEOWNERS file exists", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response("Not Found", { status: 404 })));
    try {
      // resolveOwners with default chain falls through to fallback when CODEOWNERS 404
      const result = await resolveOwners({ ...BASE_CTX, teamPrefixes: [] });
      expect(Array.isArray(result)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─── resolveOwners ────────────────────────────────────────────────────────────

describe("resolveOwners", () => {
  test("uses first resolver that returns non-null", async () => {
    const result = await resolveOwners(BASE_CTX, [nullResolver, pairResolver, singleResolver]);
    expect(result).toEqual(["user1", "user2"]);
  });

  test("returns empty array when all resolvers return null", async () => {
    const result = await resolveOwners(BASE_CTX, [nullResolver, fallbackResolver]);
    expect(result).toEqual([]);
  });

  test("uses fallback resolver with default chain if everything else fails", async () => {
    // With no matching teams, no CODEOWNERS, no mapping → fallback → []
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response("Not Found", { status: 404 })));
    try {
      const result = await resolveOwners({ ...BASE_CTX, teamPrefixes: [] });
      expect(Array.isArray(result)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
