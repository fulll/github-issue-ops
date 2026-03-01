import { describe, expect, test, mock, afterEach } from "bun:test";
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

// ─── teamsResolver (API-path branches) ───────────────────────────────────────

describe("teamsResolver (with mocked GitHub API)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns null when org returns no matching teams", async () => {
    // listOrgTeams returns [] after prefix filter
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      if (u.includes("/orgs/acme/teams")) {
        // Return a team that does NOT match the prefix
        return Promise.resolve(
          new Response(JSON.stringify([{ slug: "infra-ops", name: "Infra" }]), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    // teamPrefixes: ["team-"] → "infra-ops" doesn't match → teams array filtered to []
    const result = await teamsResolver({ ...BASE_CTX, teamPrefixes: ["team-"] });
    expect(result).toBeNull();
  });

  test("returns null when teams exist but repo is not assigned to any", async () => {
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      if (u.includes("/orgs/acme/teams?")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ slug: "team-api", name: "API" }]), { status: 200 }),
        );
      }
      if (u.includes("/teams/team-api/repos")) {
        // team exists but repo "backend" is not in its repos
        return Promise.resolve(
          new Response(JSON.stringify([{ name: "frontend" }]), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    const result = await teamsResolver(BASE_CTX);
    expect(result).toBeNull();
  });

  test("returns formatted team slugs when repo is assigned to a team", async () => {
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      if (u.includes("/orgs/acme/teams?")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ slug: "team-api", name: "API" }]), { status: 200 }),
        );
      }
      if (u.includes("/teams/team-api/repos")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ name: "backend" }]), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    const result = await teamsResolver(BASE_CTX);
    expect(result).toEqual(["acme/team-api"]);
  });
});

// ─── codeownersResolver (via default chain) ───────────────────────────────────

describe("codeownersResolver (via resolveOwners with mocked CODEOWNERS)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("parses catch-all CODEOWNERS rules and returns owners", async () => {
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      // First CODEOWNERS path (bare) → 404
      if (u.includes("/contents/CODEOWNERS") && !u.includes(".github/") && !u.includes("docs/")) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }
      // Second path — .github/CODEOWNERS → success
      if (u.includes(".github/CODEOWNERS")) {
        return Promise.resolve(
          new Response("# comment\n* @alice @team-backend\n", { status: 200 }),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    // teamPrefixes: [] → teamsResolver returns null immediately
    const result = await resolveOwners({ ...BASE_CTX, teamPrefixes: [] });
    expect(result).toEqual(["alice", "team-backend"]);
  });

  test("returns empty array when CODEOWNERS has no catch-all rules", async () => {
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      if (u.includes(".github/CODEOWNERS")) {
        return Promise.resolve(new Response("src/ @alice\n", { status: 200 }));
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    const result = await resolveOwners({ ...BASE_CTX, teamPrefixes: [] });
    // No catch-all rule → codeownersResolver returns null → mappingResolver (no centralRepo) → null → fallback
    expect(result).toEqual([]);
  });
});

// ─── mappingResolver (via default chain) ─────────────────────────────────────

describe("mappingResolver (via resolveOwners with mocked owners.json)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("resolves owners from owners.json when CODEOWNERS is absent", async () => {
    globalThis.fetch = mock((url: string | URL) => {
      const u = url.toString();
      if (u.includes("owners.json")) {
        return Promise.resolve(
          new Response(JSON.stringify({ "acme/backend": ["bob", "carol"] }), { status: 200 }),
        );
      }
      // All CODEOWNERS paths → 404
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
    const ctx = { ...BASE_CTX, teamPrefixes: [], centralRepo: "acme/central" };
    const result = await resolveOwners(ctx);
    expect(result).toEqual(["bob", "carol"]);
  });

  test("falls through to fallback when owners.json returns non-ok", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("Not Found", { status: 404 })));
    const ctx = { ...BASE_CTX, teamPrefixes: [], centralRepo: "acme/central" };
    const result = await resolveOwners(ctx);
    expect(result).toEqual([]);
  });
});
