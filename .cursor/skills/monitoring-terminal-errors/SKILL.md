---
name: monitoring-terminal-errors
description: Watch dev server, test, or build terminals for crashes and stack traces; navigate to the failing line and fix. Use when a running process shows errors.
user-invocable: true
---

# Monitoring Terminal Errors

## 1. Find the terminal

```bash
head -n 10 <terminals_folder>/*.txt
```

Locate `npm run dev`, `npm run test`, or `npm run build`.

## 2. Scan for errors

- Node: `Error:`, `TypeError:`, `ReferenceError:`, `ENOENT`, `ECONNREFUSED`
- Next.js: `Failed to compile`, `Module not found`, `Unhandled Runtime Error`
- TypeScript: `error TS\d+:`
- Vitest: failing test output with file:line

Check terminal footer for `exit_code` — process crashed and may need restart.

## 3. Fix loop

1. Extract file, line, message from stack trace
2. Read and fix root cause (fix first error — cascades often clear)
3. Re-read terminal; confirm clean compile or passing tests
4. Stop after 5 failed attempts — report to user

## 4. Common fixes in this repo

| Error | Fix |
|-------|-----|
| `MONGODB_URI` missing | Copy `.env.local.example` → `.env.local` |
| `MongoServerSelectionError` | Check Atlas URI and network access |
| Vitest DB errors | Mock `getDb` per `vitest-unit-testing` rule |
| HMR stuck | Save file to trigger rebuild or restart dev server |
