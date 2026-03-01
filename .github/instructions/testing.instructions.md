---
applyTo: "**/*.test.ts"
---

# Testing conventions

## Runner

Bun built-in test runner — `bun test`. No Jest, no Vitest.

```bash
bun test              # run all tests
bun test --coverage   # with coverage report
bun test src/core/    # specific directory
```

## Setup

`bunfig.toml` preloads `./src/test-setup.ts` before each test file:

```toml
[test]
preload = ["./src/test-setup.ts"]
```

`test-setup.ts` only sets `process.env.FORCE_COLOR = "1"` — keep it minimal.

## Mocking fetch

Mock `globalThis.fetch` directly:

```typescript
import { afterEach } from "bun:test";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

globalThis.fetch = () =>
  Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }));
```

## Coverage thresholds (bunfig.toml)

```toml
[test.coverage.threshold]
line = 0.75
function = 0.80
statement = 0.80
```

## File placement

Tests are co-located with source: `src/core/checklist.ts` → `src/core/checklist.test.ts`.

## What to test

- Pure functions (checklist, metadata, stdin parsing, dedup): full unit tests with various edge cases.
- API wrappers: mock `globalThis.fetch`; test success, 404, 503 retry paths.
- Ownership resolvers: test the resolver chain stitching; individual resolvers via mocked fetch.
- Commands: integration-style tests are optional; prefer testing the underlying helpers.
