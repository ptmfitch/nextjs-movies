import type { Filter } from "mongodb";

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

const NON_ALPHANUMERIC_PATTERN = "[^A-Za-z0-9]*";
const MIN_FUZZY_QUERY_LENGTH = 4;
const MAX_FUZZY_SEARCH_CANDIDATES = 2_000;
const LEADING_TITLE_ARTICLES = new Set(["a", "an", "the"]);

function getSearchTokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function compactTokens(tokens: string[]): string {
  return tokens.join("");
}

function buildFlexibleTitlePattern(query: string): string {
  const chars = Array.from(query);
  const alphanumericChars = chars.filter((char) => /[A-Za-z0-9]/.test(char));

  if (alphanumericChars.length < 2) {
    return escapeRegex(query);
  }

  return alphanumericChars
    .map((char) => escapeRegex(char))
    .join(NON_ALPHANUMERIC_PATTERN);
}

function buildFuzzySearchFragments(query: string): string[] {
  const fragments = new Set<string>();

  for (const token of getSearchTokens(query)) {
    if (token.length >= 3) {
      fragments.add(token.slice(0, 3));
      fragments.add(token.slice(-3));
    }
  }

  return [...fragments];
}

function buildFuzzyCandidateFilter(query: string): Filter<MovieDocument> {
  const fragments = buildFuzzySearchFragments(query);

  if (fragments.length === 0) {
    return POSTER_FILTER;
  }

  return {
    ...POSTER_FILTER,
    $or: fragments.map((fragment) => ({
      title: {
        $regex: buildFlexibleTitlePattern(fragment),
        $options: "i",
      },
    })),
  };
}

function getMaxFuzzyEdits(queryLength: number): number {
  if (queryLength <= 5) {
    return 1;
  }

  if (queryLength <= 10) {
    return 2;
  }

  return 3;
}

function getLevenshteinDistanceWithin(
  left: string,
  right: string,
  maxDistance: number,
): number {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];
    let rowMinimum = currentRow[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previousRow[rightIndex] + 1,
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex - 1] + substitutionCost,
      );

      currentRow[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previousRow = currentRow;
  }

  return previousRow[right.length];
}

function getTitleFuzzyCandidates(title: string, queryLength: number): string[] {
  const tokens = getSearchTokens(title);
  const candidates = new Set<string>();

  if (tokens.length === 0) {
    return [];
  }

  candidates.add(compactTokens(tokens));

  if (LEADING_TITLE_ARTICLES.has(tokens[0]) && tokens.length > 1) {
    candidates.add(compactTokens(tokens.slice(1)));
  }

  for (let start = 0; start < tokens.length; start += 1) {
    let candidate = "";

    for (let end = start; end < tokens.length; end += 1) {
      candidate += tokens[end];

      if (Math.abs(candidate.length - queryLength) <= 3) {
        candidates.add(candidate);
      }

      if (candidate.length > queryLength + 3) {
        break;
      }
    }
  }

  return [...candidates];
}

function isFuzzyTitleMatch(query: string, title: string | undefined): boolean {
  const queryTokens = getSearchTokens(query);
  const normalizedQuery = compactTokens(queryTokens);

  if (!title || normalizedQuery.length < MIN_FUZZY_QUERY_LENGTH) {
    return false;
  }

  const maxDistance = getMaxFuzzyEdits(normalizedQuery.length);

  return getTitleFuzzyCandidates(title, normalizedQuery.length).some(
    (candidate) =>
      getLevenshteinDistanceWithin(
        normalizedQuery,
        candidate,
        maxDistance,
      ) <= maxDistance,
  );
}

function isFuzzySearchEligible(query: string): boolean {
  return compactTokens(getSearchTokens(query)).length >= MIN_FUZZY_QUERY_LENGTH;
}

export function buildTitleSearchFilter(query: string): Filter<MovieDocument> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {};
  }

  return {
    ...POSTER_FILTER,
    title: { $regex: buildFlexibleTitlePattern(trimmed), $options: "i" },
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

async function fuzzySearchMoviesByTitle(
  query: string,
  options: MoviesQueryOptions = {},
): Promise<MoviesQueryResult> {
  const { pageSize, sort, requestedPage } = resolveQueryOptions(options);
  const db = await getDb();
  const collection = db.collection<MovieDocument>(getMongoCollectionName());

  // Fuzzy scoring happens in-process only after an exact DB search returns no
  // rows, so keep the candidate set projected and bounded.
  const candidateDocs = (await collection
    .find(buildFuzzyCandidateFilter(query))
    .project(MOVIE_PROJECTION)
    .sort(buildMovieSort(sort))
    .limit(MAX_FUZZY_SEARCH_CANDIDATES)
    .toArray()) as MovieDocument[];

  const docs = candidateDocs.filter((doc) =>
    isFuzzyTitleMatch(query, doc.title),
  );
  const total = docs.length;
  const page = clampMoviePage(requestedPage, total, pageSize);
  const pagedDocs = docs.slice((page - 1) * pageSize, page * pageSize);

  return {
    movies: pagedDocs.map(serializeMovie),
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

  const result = await queryMovies(filter, options);
  if (result.total > 0 || !isFuzzySearchEligible(query)) {
    return result;
  }

  return fuzzySearchMoviesByTitle(query, options);
}
