<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MongoDB indexes

- Index definitions: `src/lib/db-indexes.ts` — keep these aligned with query/sort patterns in `src/lib/movies.ts`.
- Sync logic: `src/lib/sync-indexes.ts` — idempotent reconcile (create missing, drop extras) with in-process deduplication.
- **Startup sync**: `src/instrumentation.ts` runs `syncMovieIndexes()` once per Node.js server instance (`dev`, `start`, Vercel).
- **Manual sync**: `npm run db:sync-indexes` (loads `.env.local` via Node `--env-file`).
- When adding or changing filters/sorts, update `MOVIE_INDEXES` in the same PR. Rerunning sync is safe.
