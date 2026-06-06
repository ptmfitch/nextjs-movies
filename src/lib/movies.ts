import type { Document, Filter } from "mongodb";

import { MOVIE_TITLE_SEARCH_INDEX } from "@/lib/db-indexes";
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

const FLEXIBLE_TITLE_SEPARATOR_PATTERN = String.raw`[\s._:;,'"!?()[\]{}&+\-/\\]*`;

export function buildFlexibleTitleRegex(query: string): string {
  const compactQuery = query.trim().replace(/\s+/g, "");
  if (!compactQuery) {
    return "";
  }

  return [...compactQuery]
    .map((character) => escapeRegex(character))
    .join(FLEXIBLE_TITLE_SEPARATOR_PATTERN);
}

export function buildTitleSearchFilter(query: string): Filter<MovieDocument> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {};
  }

  return {
    ...POSTER_FILTER,
    title: { $regex: buildFlexibleTitleRegex(trimmed), $options: "i" },
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

function buildTitleSearchStage(query: string): Document {
  return {
    $search: {
      index: MOVIE_TITLE_SEARCH_INDEX,
      compound: {
        should: [
          {
            text: {
              query,
              path: "title",
              fuzzy: {
                maxEdits: query.length <= 5 ? 1 : 2,
                prefixLength: query.length <= 3 ? 0 : 1,
                maxExpansions: 50,
              },
              score: { boost: { value: 5 } },
            },
          },
          {
            autocomplete: {
              query,
              path: "title",
              tokenOrder: "sequential",
              fuzzy: {
                maxEdits: 1,
                prefixLength: query.length <= 3 ? 0 : 1,
                maxExpansions: 50,
              },
              score: { boost: { value: 2 } },
            },
          },
        ],
        minimumShouldMatch: 1,
      },
    },
  };
}

function isAtlasSearchUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("$search is not available") ||
    normalizedMessage.includes("$search is not supported") ||
    normalizedMessage.includes("unrecognized pipeline stage name") ||
    /search index .*(does not exist|not found|could not be found)/i.test(message)
  );
}

async function searchMoviesWithAtlasSearch(
  query: string,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult | undefined> {
  const { pageSize, sort, requestedPage } = resolveQueryOptions(options);
  const db = await getDb();
  const collection = db.collection<MovieDocument>(getMongoCollectionName());
  const searchStage = buildTitleSearchStage(query);
  const countPipeline = [searchStage, { $match: POSTER_FILTER }, { $count: "total" }];

  try {
    const [countResult] = await collection
      .aggregate<{ total: number }>(countPipeline)
      .toArray();
    const total = countResult?.total ?? 0;
    const page = clampMoviePage(requestedPage, total, pageSize);

    if (total === 0) {
      return { movies: [], total, page, pageSize };
    }

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
  } catch (error) {
    if (isAtlasSearchUnavailableError(error)) {
      return undefined;
    }

    throw error;
  }
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
  const trimmed = query.trim();
  const filter = buildTitleSearchFilter(trimmed);
  if (Object.keys(filter).length === 0) {
    return listMovies(options);
  }

  const atlasSearchResult = await searchMoviesWithAtlasSearch(trimmed, options);
  if (atlasSearchResult && atlasSearchResult.total > 0) {
    return atlasSearchResult;
  }

  return queryMovies(filter, options);
}
