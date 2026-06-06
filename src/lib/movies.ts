import type { Filter } from "mongodb";

import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import { normalizeYear } from "@/lib/normalize";
import { escapeRegex } from "@/lib/regex";
import type { Movie, MovieDocument } from "@/types/movie";

export const POSTER_FILTER = {
  poster: { $exists: true, $ne: "" },
} as const;

export const MOVIE_PROJECTION = {
  title: 1,
  year: 1,
  runtime: 1,
  genres: 1,
  cast: 1,
  poster: 1,
  "imdb.rating": 1,
} as const;

export function buildTitleSearchFilter(query: string): Filter<MovieDocument> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {};
  }

  return {
    ...POSTER_FILTER,
    title: { $regex: escapeRegex(trimmed), $options: "i" },
  };
}

function serializeMovie(doc: MovieDocument): Movie {
  return {
    _id: doc._id.toString(),
    title: doc.title ?? "Untitled",
    year: normalizeYear(doc.year),
    runtime: doc.runtime ?? 0,
    genres: doc.genres ?? [],
    cast: doc.cast ?? [],
    poster: doc.poster ?? "",
    imdb: { rating: doc.imdb?.rating ?? 0 },
  };
}

export async function listMovies(limit = 24): Promise<Movie[]> {
  const db = await getDb();
  const docs = (await db
    .collection<MovieDocument>(getMongoCollectionName())
    .find(POSTER_FILTER)
    .project(MOVIE_PROJECTION)
    .sort({ year: -1 })
    .limit(limit)
    .toArray()) as MovieDocument[];

  return docs.map(serializeMovie);
}

export async function searchMoviesByTitle(
  query: string,
  limit = 24,
): Promise<Movie[]> {
  const filter = buildTitleSearchFilter(query);
  if (Object.keys(filter).length === 0) {
    return listMovies(limit);
  }

  const db = await getDb();
  const docs = (await db
    .collection<MovieDocument>(getMongoCollectionName())
    .find(filter)
    .project(MOVIE_PROJECTION)
    .sort({ "imdb.rating": -1 })
    .limit(limit)
    .toArray()) as MovieDocument[];

  return docs.map(serializeMovie);
}
