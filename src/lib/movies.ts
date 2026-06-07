import type { Filter } from "mongodb";

import { getMongoCollectionName } from "@/lib/env";
import {
  DEFAULT_MOVIE_SORT,
  MOVIES_PAGE_SIZE,
  buildMovieSort,
  clampMoviePage,
  isMovieImdbRatingSort,
  type MovieSort,
  type MoviesQueryOptions,
  type MoviesQueryResult,
} from "@/lib/movie-params";
import { getDb } from "@/lib/mongodb";
import { normalizeYear } from "@/lib/normalize";
import { escapeRegex } from "@/lib/regex";
import type { Movie, MovieDocument } from "@/types/movie";

export {
  DEFAULT_MOVIE_SORT,
  MOVIES_PAGE_SIZE,
  buildMovieSort,
  buildMoviesRange,
  formatMoviesRangeText,
  isMovieImdbRatingSort,
  parseMoviePage,
  parseMovieSort,
  type MovieSort,
  type MoviesQueryOptions,
  type MoviesQueryResult,
  type MoviesRange,
} from "@/lib/movie-params";

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

const IMDB_RATING_FILTER = {
  "imdb.rating": { $type: "number" },
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

function normalizeImdbRating(rating: number | string | undefined): number {
  return typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
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
    imdb: { rating: normalizeImdbRating(doc.imdb?.rating) },
  };
}

function buildQueryFilter(
  filter: Filter<MovieDocument>,
  sort: MovieSort,
): Filter<MovieDocument> {
  if (!isMovieImdbRatingSort(sort)) {
    return filter;
  }

  return {
    ...filter,
    ...IMDB_RATING_FILTER,
  };
}

function resolveQueryOptions(options: MoviesQueryOptions = {}) {
  const pageSize = options.pageSize ?? MOVIES_PAGE_SIZE;
  const sort = options.sort ?? DEFAULT_MOVIE_SORT;
  const requestedPage = options.page ?? 1;

  return { pageSize, sort, requestedPage };
}

async function queryMovies(
  filter: Filter<MovieDocument>,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  const { pageSize, sort, requestedPage } = resolveQueryOptions(options);
  const db = await getDb();
  const collection = db.collection<MovieDocument>(getMongoCollectionName());
  const queryFilter = buildQueryFilter(filter, sort);

  const total = await collection.countDocuments(queryFilter);
  const page = clampMoviePage(requestedPage, total, pageSize);

  const docs = (await collection
    .find(queryFilter)
    .project(MOVIE_PROJECTION)
    .sort(buildMovieSort(sort))
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray()) as MovieDocument[];

  return {
    movies: docs.map(serializeMovie),
    total,
    page,
    pageSize,
  };
}

export async function listMovies(
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  return queryMovies(POSTER_FILTER, options);
}

export async function searchMoviesByTitle(
  query: string,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  const filter = buildTitleSearchFilter(query);
  if (Object.keys(filter).length === 0) {
    return listMovies(options);
  }

  return queryMovies(filter, options);
}
