<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Services

| Service | Port | Notes |
|---------|------|-------|
| Next.js dev server | 3000 | `npm run dev` |
| MongoDB (required) | 27017 | App reads `MONGODB_URI` from `.env.local` |

There is no Docker Compose or bundled database. Full end-to-end development requires a MongoDB instance with a `sample_mflix.movies` collection (Atlas `sample_mflix` is the intended target; see `README.md`).

### Environment

Copy `.env.local.example` to `.env.local` and set `MONGODB_URI`. Optional overrides: `MONGODB_DB` (default `sample_mflix`), `MONGODB_COLLECTION` (default `movies`).

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
