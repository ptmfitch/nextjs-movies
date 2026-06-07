import type { Collection, Document, Filter } from "mongodb";

import { MOVIE_SEARCH_INDEX_NAME } from "@/lib/db-indexes";
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

function buildCompactWildcardQuery(query: string): string | null {
  const compact = query.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compact.length < 3) {
    return null;
  }

  return `*${Array.from(compact).join("*")}*`;
}

export function buildTitleSearchStage(query: string): Document | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const should: Document[] = [
    {
      phrase: {
        query: trimmed,
        path: "title",
        slop: 1,
        score: { boost: { value: 12 } },
      },
    },
    {
      text: {
        query: trimmed,
        path: "title",
        fuzzy: {
          maxEdits: 2,
          prefixLength: 1,
          maxExpansions: 50,
        },
        score: { boost: { value: 8 } },
      },
    },
  ];

  const wildcardQuery = buildCompactWildcardQuery(trimmed);
  if (wildcardQuery) {
    should.push({
      wildcard: {
        query: wildcardQuery,
        path: { value: "title", multi: "keyword" },
        allowAnalyzedField: true,
        score: { boost: { value: 4 } },
      },
    });
  }

  return {
    $search: {
      index: MOVIE_SEARCH_INDEX_NAME,
      compound: {
        filter: [
          {
            exists: {
              path: "poster",
            },
          },
        ],
        should,
        minimumShouldMatch: 1,
      },
    },
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

  const total = await collection.countDocuments(filter);
  const page = clampMoviePage(requestedPage, total, pageSize);

  const docs = (await collection
    .find(filter)
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

async function countSearchMovies(
  collection: Collection<MovieDocument>,
  searchStage: Document,
): Promise<number> {
  const [result] = await collection
    .aggregate<{ total: number }>([
      searchStage,
      { $match: POSTER_FILTER },
      { $count: "total" },
    ])
    .toArray();

  return result?.total ?? 0;
}

async function querySearchMovies(
  collection: Collection<MovieDocument>,
  searchStage: Document,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  const { pageSize, sort, requestedPage } = resolveQueryOptions(options);
  const total = await countSearchMovies(collection, searchStage);
  const page = clampMoviePage(requestedPage, total, pageSize);

  const docs = (await collection
    .aggregate<MovieDocument>([
      searchStage,
      { $match: POSTER_FILTER },
      { $sort: buildMovieSort(sort) },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $project: MOVIE_PROJECTION },
    ])
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
  const searchStage = buildTitleSearchStage(query);
  if (!searchStage) {
    return listMovies(options);
  }

  const db = await getDb();
  const collection = db.collection<MovieDocument>(getMongoCollectionName());

  return querySearchMovies(collection, searchStage, options);
}
