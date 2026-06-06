---
name: auditing-performance
description: Audit bundle size, rendering, data fetching, database queries, and Core Web Vitals. Use when optimizing load times or investigating slowness. Query limits and MongoDB constraints are in the nodejs-mongodb rule.
---

# Performance Audit

Produce a prioritized report (High / Medium / Low impact + effort).

## 1. Bundle

- `npx @next/bundle-analyzer` for large deps and duplicate packages.
- Check barrel re-exports pulling unused code.

## 2. Rendering

- Unnecessary re-renders (inline objects/functions in JSX props).
- Missing `key` on dynamic lists.
- Client data that could be server-fetched.

## 3. Data fetching

- Request waterfalls → parallelize with `Promise.all`.
- Over-fetching fields the UI does not use.
- Unbounded queries — verify `.limit()` per `nodejs-mongodb` rule.

## 4. MongoDB

Apply constraints from `.cursor/rules/nodejs-mongodb.mdc`:

- Regex title search without indexes
- Connection pooling via cached `getDb()`
- Projection on large documents

## 5. Assets

- `loading="lazy"` on below-fold posters (`PosterImage`)
- Font loading (`next/font` in `layout.tsx`)
- Failed/slow external poster requests in network tab

## 6. Measure

Use Lighthouse, DevTools Performance, or React Profiler before recommending changes. Profile first; optimize bottlenecks only.
