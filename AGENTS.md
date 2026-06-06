<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MongoDB indexes

- Index definitions: `src/lib/db-indexes.ts` — keep these aligned with query/sort patterns in `src/lib/movies.ts`.
- Sync logic: `src/lib/sync-indexes.ts` — idempotent `createIndexes()` with in-process deduplication.
- **Startup sync**: `src/instrumentation.ts` runs `syncMovieIndexes()` once per Node.js server instance (`dev`, `start`, Vercel).
- **Manual sync**: `npm run db:sync-indexes` (loads `.env.local` via Node `--env-file`).
- When adding or changing filters/sorts, update `MOVIE_INDEXES` in the same PR. Rerunning sync is safe.
## Cursor Cloud specific instructions

Single Next.js 16 app (`nextjs-movies`) backed by MongoDB `sample_mflix.movies`. See `README.md` for standard scripts.

### Services

| Service | Port | Notes |
|---------|------|-------|
| Next.js dev server | 3000 | `npm run dev` |
| MongoDB (required) | 27017 / Atlas | App reads `MONGODB_URI` from `.env.local` |

There is no Docker Compose or bundled database. Full end-to-end development requires a MongoDB instance with a `sample_mflix.movies` collection (Atlas `sample_mflix` is the intended target).

### MongoDB setup (Atlas — preferred)

Cloud Agents use a dedicated Atlas M0 cluster:

| Setting | Value |
|---------|-------|
| Cluster | `cloud-agent-dev` |
| Tier | M0 (free) |
| Provider / region | AWS `EU_WEST_1` (Ireland) |
| Project ID | `6a241f45f8d5f7a427bf9be4` |
| Database / collection | `sample_mflix.movies` (sample dataset loaded) |

Copy `.env.local.example` to `.env.local` and set `MONGODB_URI` to the Atlas `mongodb+srv://` connection string. Store `MONGODB_URI` as a Cursor Cloud Agent secret so future sessions pick it up automatically.

Optional secrets for reprovisioning via Atlas Admin API: `ATLAS_PUBLIC_KEY`, `ATLAS_PRIVATE_KEY`, `ATLAS_PROJECT_ID`.

Optional overrides: `MONGODB_DB` (default `sample_mflix`), `MONGODB_COLLECTION` (default `movies`).

### MongoDB setup (local fallback)

If no Atlas URI is available as a secret, start a local MongoDB and seed `sample_mflix.movies` with documents that include a non-empty `poster` field (the app filters on posters). Example local URI: `mongodb://127.0.0.1:27017`.

MongoDB is **not** started by the update script. Start it manually when needed, e.g.:

```bash
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --bind_ip 127.0.0.1 --port 27017 --logpath /tmp/mongod.log --fork
```

### Commands

Standard scripts are in `package.json` / `README.md`: `npm run dev`, `lint`, `test:run`, `build`, `start`.

### Gotchas

- Without `MONGODB_URI`, the homepage shows a configuration error instead of movies.
- Unit tests mock MongoDB and do not need a live database; browser/E2E verification does.
- Poster images load from external URLs in MongoDB documents; some may fail and show a fallback UI (expected).
