import { describe, expect, it } from "vitest";

import {
  buildMovieSort,
  buildMoviesRange,
  clampMoviePage,
  formatMoviesRangeText,
  isMovieImdbRatingSort,
  parseMoviePage,
  parseMovieSort,
} from "@/lib/movie-params";

describe("parseMovieSort", () => {
  it("returns the sort value when valid", () => {
    expect(parseMovieSort("title-asc")).toBe("title-asc");
    expect(parseMovieSort("year-asc")).toBe("year-asc");
    expect(parseMovieSort("imdb-rating-desc")).toBe("imdb-rating-desc");
  });

  it("falls back to year-desc for invalid values", () => {
    expect(parseMovieSort(undefined)).toBe("year-desc");
    expect(parseMovieSort("invalid")).toBe("year-desc");
  });
});

describe("parseMoviePage", () => {
  it("parses positive integers", () => {
    expect(parseMoviePage("3")).toBe(3);
  });

  it("falls back to 1 for invalid values", () => {
    expect(parseMoviePage(undefined)).toBe(1);
    expect(parseMoviePage("0")).toBe(1);
    expect(parseMoviePage("-2")).toBe(1);
    expect(parseMoviePage("abc")).toBe(1);
  });
});

describe("buildMovieSort", () => {
  it("maps sort options to MongoDB sort objects", () => {
    expect(buildMovieSort("year-desc")).toEqual({ year: -1 });
    expect(buildMovieSort("year-asc")).toEqual({ year: 1 });
    expect(buildMovieSort("title-asc")).toEqual({ title: 1 });
    expect(buildMovieSort("title-desc")).toEqual({ title: -1 });
    expect(buildMovieSort("imdb-rating-desc")).toEqual({ "imdb.rating": -1 });
    expect(buildMovieSort("imdb-rating-asc")).toEqual({ "imdb.rating": 1 });
  });
});

describe("isMovieImdbRatingSort", () => {
  it("detects IMDb rating sort options", () => {
    expect(isMovieImdbRatingSort("imdb-rating-desc")).toBe(true);
    expect(isMovieImdbRatingSort("imdb-rating-asc")).toBe(true);
    expect(isMovieImdbRatingSort("year-desc")).toBe(false);
  });
});

describe("buildMoviesRange", () => {
  it("returns zero range for empty results", () => {
    expect(buildMoviesRange({ page: 1, pageSize: 24, total: 0 })).toEqual({
      start: 0,
      end: 0,
      total: 0,
    });
  });

  it("calculates the visible range for a page", () => {
    expect(buildMoviesRange({ page: 2, pageSize: 24, total: 50 })).toEqual({
      start: 25,
      end: 48,
      total: 50,
    });
  });
});

describe("formatMoviesRangeText", () => {
  it("formats empty results", () => {
    expect(
      formatMoviesRangeText({ start: 0, end: 0, total: 0 }),
    ).toBe("Showing 0 movies out of 0");
  });

  it("uses singular movie for a single result", () => {
    expect(
      formatMoviesRangeText({ start: 1, end: 1, total: 1 }),
    ).toBe("Showing 1–1 movie out of 1");
  });

  it("formats a multi-page range", () => {
    expect(
      formatMoviesRangeText({ start: 1, end: 24, total: 150 }),
    ).toBe("Showing 1–24 movies out of 150");
  });
});

describe("clampMoviePage", () => {
  it("returns 1 for empty result sets", () => {
    expect(clampMoviePage(5, 0, 24)).toBe(1);
  });

  it("clamps to the last page when the request exceeds total pages", () => {
    expect(clampMoviePage(5, 30, 24)).toBe(2);
  });
});
