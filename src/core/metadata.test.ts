import { describe, expect, test } from "bun:test";
import { embedMetadata, extractMetadata, updateMetadata, stripMetadata } from "./metadata.ts";
import type { EpicMetadata } from "../types.ts";

const MOCK_META: EpicMetadata = {
  version: 1,
  replayCommand: "github-code-search TODO --org acme",
  createdAt: "2024-01-01T00:00:00.000Z",
  config: {
    repo: "acme/platform",
    labels: ["epic"],
    teamPrefixes: ["team-"],
  },
};

describe("embedMetadata", () => {
  test("appends HTML comment block to body", () => {
    const body = "## My issue\n\nSome text";
    const result = embedMetadata(body, MOCK_META);
    expect(result).toContain("<!-- github-issue-ops:metadata");
    expect(result).toContain('"version":1');
    expect(result).toContain("-->");
  });

  test("replaces existing metadata block", () => {
    const first = embedMetadata("body text", MOCK_META);
    const second = embedMetadata(first, { ...MOCK_META, createdAt: "2025-01-01T00:00:00.000Z" });
    const count = (second.match(/<!-- github-issue-ops:metadata/g) ?? []).length;
    expect(count).toBe(1);
    expect(second).toContain("2025-01-01");
    expect(second).not.toContain("2024-01-01");
  });
});

describe("extractMetadata", () => {
  test("returns null for body without metadata", () => {
    expect(extractMetadata("## No metadata here")).toBeNull();
  });

  test("round-trips through embedMetadata", () => {
    const body = embedMetadata("## Issue body", MOCK_META);
    const extracted = extractMetadata(body);
    expect(extracted).not.toBeNull();
    expect(extracted?.version).toBe(1);
    expect(extracted?.replayCommand).toBe(MOCK_META.replayCommand);
    expect(extracted?.config.repo).toBe("acme/platform");
  });

  test("returns null for malformed JSON in comment", () => {
    const broken = "<!-- github-issue-ops:metadata\n{invalid json}\n-->";
    expect(extractMetadata(broken)).toBeNull();
  });
});

describe("updateMetadata", () => {
  test("updates a field in existing metadata", () => {
    const body = embedMetadata("## Issue", MOCK_META);
    const updated = updateMetadata(body, { replayCommand: "new-command" });
    const meta = extractMetadata(updated);
    expect(meta?.replayCommand).toBe("new-command");
  });

  test("returns body unchanged if no metadata present", () => {
    const body = "## No metadata";
    const updated = updateMetadata(body, { replayCommand: "anything" });
    expect(updated).toBe(body);
  });
});

describe("stripMetadata", () => {
  test("removes metadata comment from body", () => {
    const body = embedMetadata("## Issue text", MOCK_META);
    const stripped = stripMetadata(body);
    expect(stripped).not.toContain("<!-- github-issue-ops:metadata");
    expect(stripped).toContain("## Issue text");
  });

  test("returns body unchanged if no metadata present", () => {
    const body = "## Plain body";
    expect(stripMetadata(body)).toBe(body);
  });
});
