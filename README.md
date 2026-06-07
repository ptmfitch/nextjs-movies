# Next.js Movies

A simple Next.js app that browses and searches movies from the MongoDB `sample_mflix.movies` collection.

## Prerequisites

- Node.js 20+
- A MongoDB connection string with access to the `sample_mflix` database

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and add your connection string:

```bash
cp .env.local.example .env.local
```

3. Set these variables in `.env.local`:

```env
MONGODB_URI=<your MongoDB connection string>
MONGODB_DB=sample_mflix
MONGODB_COLLECTION=movies
```

`MONGODB_DB` and `MONGODB_COLLECTION` are optional. They default to `sample_mflix` and `movies`.

4. Sync MongoDB indexes (optional if you will run `dev` or `start` — see below):

```bash
npm run db:sync-indexes
```

## Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Run the production server
npm run lint      # Run ESLint
npm run test      # Run Vitest in watch mode
npm run test:run  # Run Vitest once
npm run db:sync-indexes  # Ensure movie indexes exist (idempotent)
```

## Features

- Browse the latest movies with large poster images
- Search movies by title (case-insensitive)
- Sort movies by year, title, or IMDb score
- Server-rendered App Router page backed by MongoDB
- Vitest unit tests for helpers and UI components

## Database indexes

Index definitions live in `src/lib/db-indexes.ts` and are applied automatically when the server starts via `src/instrumentation.ts`. The sync is **idempotent**: it creates missing indexes and drops extras not in the manifest (`_id_` is preserved), so every environment ends up with the same set; reruns are safe.

You can also sync manually:

```bash
npm run db:sync-indexes
```

Use the manual script after changing index definitions, or when you want indexes in place without starting the app. Dev, production, and cloud agent environments all share the same manifest — only `MONGODB_URI` differs.

## Notes

- Title search uses a regex filter and is capped to 24 results for responsiveness. Regex search is not covered by the compound indexes; Atlas Search would be needed for large-scale text search.
