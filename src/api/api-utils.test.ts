import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { fetchWithRetry, paginatedFetch, formatRetryWait } from "./api-utils.ts";

// ─── formatRetryWait ──────────────────────────────────────────────────────────

describe("formatRetryWait", () => {
  test("formats seconds correctly", () => {
    expect(formatRetryWait(1000)).toBe("1 second");
    expect(formatRetryWait(5000)).toBe("5 seconds");
    expect(formatRetryWait(60000)).toBe("1 minute");
  });
});

// ─── fetchWithRetry ───────────────────────────────────────────────────────────

describe("fetchWithRetry", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns successful response immediately", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    globalThis.fetch = mock(() => Promise.resolve(mockResponse));

    const res = await fetchWithRetry("https://api.github.com/test", {});
    expect(res.status).toBe(200);
  });

  test("retries on 503 and eventually succeeds", async () => {
    let calls = 0;
    globalThis.fetch = mock(() => {
      calls++;
      if (calls < 3) {
        return Promise.resolve(
          new Response("Service Unavailable", {
            status: 503,
            headers: { "Retry-After": "0" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    // maxRetries = 3 (positional 3rd arg)
    const res = await fetchWithRetry("https://api.github.com/test", {}, 3);
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  test("returns last failing response after max retries on persistent 503", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Service Unavailable", {
          status: 503,
          headers: { "Retry-After": "0" },
        }),
      ),
    );

    // maxRetries = 2 → returns res after 2 retries
    const res = await fetchWithRetry("https://api.github.com/test", {}, 2);
    expect(res.status).toBe(503);
  });

  test("returns 404 immediately without retrying", async () => {
    let calls = 0;
    globalThis.fetch = mock(() => {
      calls++;
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });

    const res = await fetchWithRetry("https://api.github.com/test", {}, 3);
    // 404 is not retried, returned immediately
    expect(res.status).toBe(404);
    expect(calls).toBe(1);
  });

  test("uses x-ratelimit-reset header for delay when available", async () => {
    // x-ratelimit-reset in the past → delay = 0 → retries immediately
    const resetTimestamp = Math.floor(Date.now() / 1_000) - 5; // 5 s in the past
    let calls = 0;
    globalThis.fetch = mock(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(
          new Response("Rate limited", {
            status: 429,
            headers: { "x-ratelimit-reset": String(resetTimestamp) },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const res = await fetchWithRetry("https://api.github.com/test", {}, 3);
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  test("throws when wait exceeds MAX_AUTO_RETRY_WAIT_MS", async () => {
    // Retry-After of 60 s > MAX_AUTO_RETRY_WAIT_MS (10 s) → should throw
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Rate limited", {
          status: 429,
          headers: { "Retry-After": "60" },
        }),
      ),
    );

    await expect(fetchWithRetry("https://api.github.com/test", {}, 3)).rejects.toThrow("retry in");
  });

  test("uses exponential back-off when no header is present", async () => {
    // No Retry-After and no x-ratelimit-reset → exponential back-off
    // Jitter: 0.9–1.1 × BASE_RETRY_DELAY_MS (1 s) → would take ~1 s.
    // Use Retry-After: "0" (zero delay) to exercise the >= 0 fix without sleeping.
    let calls = 0;
    globalThis.fetch = mock(() => {
      calls++;
      if (calls < 2) {
        return Promise.resolve(
          new Response("Rate limited", {
            status: 429,
            headers: { "Retry-After": "0" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const res = await fetchWithRetry("https://api.github.com/test", {}, 3);
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });
});

// ─── paginatedFetch ───────────────────────────────────────────────────────────

describe("paginatedFetch", () => {
  test("collects results from a single page", async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const fetchPage = mock(() => Promise.resolve(items));

    // 2 items < pageSize (100) → single page
    const result = await paginatedFetch<{ id: number }>(fetchPage);
    expect(result).toHaveLength(2);
  });

  test("follows pagination until last page", async () => {
    let page = 0;
    const fetchPage = mock((_page: number) => {
      page++;
      // Return full page (100 items) on page 1, partial on page 2
      if (page === 1) return Promise.resolve(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      return Promise.resolve([{ id: 100 }]);
    });

    const result = await paginatedFetch<{ id: number }>(fetchPage, 100);
    expect(result).toHaveLength(101);
    expect(page).toBe(2);
  });
});
