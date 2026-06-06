---
name: writing-tests
description: Analyze code and write unit tests with proper mocking and edge cases. Use when adding tests or improving coverage. Conventions live in the vitest-unit-testing rule.
---

# Writing Tests

Workflow for adding tests. **Conventions** (colocation, mocking, queries): follow `.cursor/rules/vitest-unit-testing.mdc`.

## 1. Analyze target code

Read the module and identify:

- Exported public API
- Branches, error paths, edge cases (empty, null, boundary)
- Dependencies to mock (`getDb`, env, network)

## 2. Write tests

Structure:

```ts
describe("functionName", () => {
  it("handles the happy path", () => { ... });
  it("handles empty input", () => { ... });
  it("handles errors", () => { ... });
});
```

- Lib modules: test pure helpers without I/O (`movies.test.ts`, `regex.test.ts` as references).
- Components: `render` + `screen.getByRole`; mock data-fetching at boundaries.
- Async: always `await` or use `resolves`/`rejects`.

## 3. Run and fix

```bash
npm run test:run
```

Fix failing tests or implementation — whichever is wrong.

## Scope

**Test**: public API, error handling, edge cases, async behavior.

**Skip**: private internals, third-party libs, trivial getters, type-only code.
