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

## Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Run the production server
npm run lint      # Run ESLint
npm run test      # Run Vitest in watch mode
npm run test:run  # Run Vitest once
```

## Features

- Browse the latest movies with large poster images
- Search movies by title (case-insensitive)
- Server-rendered App Router page backed by MongoDB
- Vitest unit tests for helpers and UI components

## Notes

- This app does **not** create any MongoDB indexes.
- Title search uses a regex filter and is capped to 24 results for responsiveness.
