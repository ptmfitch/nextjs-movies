export type MovieSort =
  | "year-desc"
  | "year-asc"
  | "title-asc"
  | "title-desc"
  | "imdb-rating-desc"
  | "imdb-rating-asc";

type MovieSortSpec = Record<string, 1 | -1>;

export const MOVIES_PAGE_SIZE = 24;
export const DEFAULT_MOVIE_SORT: MovieSort = "year-desc";

const MOVIE_SORT_VALUES: readonly MovieSort[] = [
  "year-desc",
  "year-asc",
  "title-asc",
  "title-desc",
  "imdb-rating-desc",
  "imdb-rating-asc",
];

export interface MoviesQueryOptions {
  page?: number;
  pageSize?: number;
  sort?: MovieSort;
}

export interface MoviesQueryResult {
  movies: import("@/types/movie").Movie[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MoviesRange {
  start: number;
  end: number;
  total: number;
}

export function parseMovieSort(value: string | undefined): MovieSort {
  if (value && MOVIE_SORT_VALUES.includes(value as MovieSort)) {
    return value as MovieSort;
  }

  return DEFAULT_MOVIE_SORT;
}

export function parseMoviePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function buildMovieSort(sort: MovieSort): MovieSortSpec {
  switch (sort) {
    case "year-asc":
      return { year: 1 };
    case "title-asc":
      return { title: 1 };
    case "title-desc":
      return { title: -1 };
    case "imdb-rating-desc":
      return { "imdb.rating": -1 };
    case "imdb-rating-asc":
      return { "imdb.rating": 1 };
    case "year-desc":
    default:
      return { year: -1 };
  }
}

export function buildMoviesRange({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}): MoviesRange {
  if (total === 0) {
    return { start: 0, end: 0, total: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return { start, end, total };
}

export function formatMoviesRangeText({ start, end, total }: MoviesRange): string {
  if (total === 0) {
    return "Showing 0 movies out of 0";
  }

  const noun = total === 1 ? "movie" : "movies";
  return `Showing ${start}–${end} ${noun} out of ${total}`;
}

export function clampMoviePage(
  page: number,
  total: number,
  pageSize: number,
): number {
  if (total === 0) {
    return 1;
  }

  const totalPages = Math.ceil(total / pageSize);
  return Math.min(page, totalPages);
}
