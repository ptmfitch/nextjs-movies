import { describe, expect, it } from "vitest";

import { buildMovieListUrl, readMovieListParams } from "@/lib/movie-list-url";

describe("buildMovieListUrl", () => {
  it("returns the home path when all params are defaults", () => {
    expect(buildMovieListUrl()).toBe("/");
    expect(buildMovieListUrl({ page: 1, sort: "year-desc" })).toBe("/");
  });

  it("includes non-default query, page, and sort params", () => {
    expect(
      buildMovieListUrl({
        q: "matrix",
        page: 2,
        sort: "imdb-rating-desc",
      }),
    ).toBe("/?q=matrix&page=2&sort=imdb-rating-desc");
  });

  it("trims the search query", () => {
    expect(buildMovieListUrl({ q: "  inception  " })).toBe("/?q=inception");
  });
});

describe("readMovieListParams", () => {
  it("reads and normalizes URL search params", () => {
    const params = new URLSearchParams(
      "q=matrix&page=3&sort=imdb-rating-asc",
    );

    expect(readMovieListParams(params)).toEqual({
      q: "matrix",
      page: 3,
      sort: "imdb-rating-asc",
    });
  });

  it("falls back to defaults for missing values", () => {
    expect(readMovieListParams(new URLSearchParams())).toEqual({
      q: "",
      page: 1,
      sort: "year-desc",
    });
  });
});
