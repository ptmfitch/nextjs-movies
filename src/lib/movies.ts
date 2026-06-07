import type { Document, Filter } from "mongodb";

import { getMongoCollectionName } from "@/lib/env";
import {
  DEFAULT_MOVIE_SORT,
  MOVIES_PAGE_SIZE,
  buildMovieSort,
  clampMoviePage,
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

function normalizeImdbRating(value: number | string | undefined): number {
  const rating = typeof value === "number" ? value : Number(value);
  return Number.isFinite(rating) && rating > 0 ? rating : 0;
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

function resolveQueryOptions(options: MoviesQueryOptions = {}) {
  const pageSize = options.pageSize ?? MOVIES_PAGE_SIZE;
  const sort = options.sort ?? DEFAULT_MOVIE_SORT;
  const requestedPage = options.page ?? 1;

  return { pageSize, sort, requestedPage };
}

function isImdbRatingSort(sort: string): sort is "imdb-rating-desc" | "imdb-rating-asc" {
  return sort === "imdb-rating-desc" || sort === "imdb-rating-asc";
}

function buildImdbRatingSortPipeline({
  filter,
  sort,
  page,
  pageSize,
}: {
  filter: Filter<MovieDocument>;
  sort: "imdb-rating-desc" | "imdb-rating-asc";
  page: number;
  pageSize: number;
}): Document[] {
  const direction = sort === "imdb-rating-desc" ? -1 : 1;

  return [
    { $match: filter },
    { $project: MOVIE_PROJECTION },
    {
      $addFields: {
        __imdbRatingSort: {
          $convert: {
            input: "$imdb.rating",
            to: "double",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $addFields: {
        __imdbRatingMissing: {
          $cond: [
            {
              $or: [
                { $eq: ["$__imdbRatingSort", null] },
                { $lte: ["$__imdbRatingSort", 0] },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
    {
      $sort: {
        __imdbRatingMissing: 1,
        __imdbRatingSort: direction,
        title: 1,
      },
    },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
  ];
}

async function queryMovies(
  filter: Filter<MovieDocument>,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  const { pageSize, sort, requestedPage } = resolveQueryOptions(options);
  const db = await getDb();
  const collection = db.collection<MovieDocument>(getMongoCollectionName());

  const total = await collection.countDocuments(filter);
  const page = clampMoviePage(requestedPage, total, pageSize);
  const mongoSort = buildMovieSort(sort);

  const docs = isImdbRatingSort(sort)
    ? ((await collection
        .aggregate<MovieDocument>(
          buildImdbRatingSortPipeline({ filter, sort, page, pageSize }),
        )
        .toArray()) as MovieDocument[])
    : ((await collection
        .find(filter)
        .project(MOVIE_PROJECTION)
        .sort(mongoSort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray()) as MovieDocument[]);

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
