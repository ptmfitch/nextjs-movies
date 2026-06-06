import {
  DEFAULT_MOVIE_SORT,
  parseMoviePage,
  parseMovieSort,
  type MovieSort,
} from "@/lib/movie-params";

export interface MovieListUrlParams {
  q?: string;
  page?: number;
  sort?: MovieSort;
}

export function buildMovieListUrl({
  q,
  page,
  sort,
}: MovieListUrlParams = {}): string {
  const params = new URLSearchParams();
  const trimmedQuery = q?.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (sort && sort !== DEFAULT_MOVIE_SORT) {
    params.set("sort", sort);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export function readMovieListParams(searchParams: URLSearchParams): {
  q: string;
  page: number;
  sort: MovieSort;
} {
  return {
    q: searchParams.get("q") ?? "",
    page: parseMoviePage(searchParams.get("page") ?? undefined),
    sort: parseMovieSort(searchParams.get("sort") ?? undefined),
  };
}
