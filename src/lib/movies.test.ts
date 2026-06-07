import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOVIE_PROJECTION,
  POSTER_FILTER,
  buildTitleSearchFilter,
  listMovies,
  searchMoviesByTitle,
} from "@/lib/movies";
import { getDb } from "@/lib/mongodb";

const mockToArray = vi.fn();
const mockLimit = vi.fn(() => ({ toArray: mockToArray }));
const mockSkip = vi.fn(() => ({ limit: mockLimit }));
const mockSort = vi.fn(() => ({ skip: mockSkip }));
const mockProject = vi.fn(() => ({ sort: mockSort }));
const mockFind = vi.fn(() => ({ project: mockProject }));
const mockAggregate = vi.fn(() => ({ toArray: mockToArray }));
const mockCountDocuments = vi.fn();
const mockCollection = vi.fn(() => ({
  find: mockFind,
  aggregate: mockAggregate,
  countDocuments: mockCountDocuments,
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getMongoCollectionName: () => "movies",
}));

describe("buildTitleSearchFilter", () => {
  it("returns an empty filter for blank queries", () => {
    expect(buildTitleSearchFilter("")).toEqual({});
    expect(buildTitleSearchFilter("   ")).toEqual({});
  });

  it("builds a case-insensitive title regex filter with poster constraint", () => {
    expect(buildTitleSearchFilter("matrix")).toEqual({
      poster: { $exists: true, $ne: "" },
      title: { $regex: "matrix", $options: "i" },
    });
  });

  it("escapes regex characters in the query", () => {
    expect(buildTitleSearchFilter("C++")).toEqual({
      poster: { $exists: true, $ne: "" },
      title: { $regex: "C\\+\\+", $options: "i" },
    });
  });
});

describe("listMovies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as never);
  });

  it("queries movies with poster filter, projection, sort, skip, and limit", async () => {
    mockCountDocuments.mockResolvedValue(50);
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "abc123" },
        title: "Inception",
        year: 2010,
        runtime: 148,
        genres: ["Action"],
        cast: ["Leonardo DiCaprio"],
        poster: "https://example.com/inception.jpg",
        imdb: { rating: 8.8 },
      },
    ]);

    const result = await listMovies({ page: 2, pageSize: 12, sort: "title-asc" });

    expect(mockCollection).toHaveBeenCalledWith("movies");
    expect(mockCountDocuments).toHaveBeenCalledWith(POSTER_FILTER);
    expect(mockFind).toHaveBeenCalledWith(POSTER_FILTER);
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ title: 1 });
    expect(mockSkip).toHaveBeenCalledWith(12);
    expect(mockLimit).toHaveBeenCalledWith(12);
    expect(result).toEqual({
      movies: [
        {
          _id: "abc123",
          title: "Inception",
          year: 2010,
          runtime: 148,
          genres: ["Action"],
          cast: ["Leonardo DiCaprio"],
          poster: "https://example.com/inception.jpg",
          imdb: { rating: 8.8 },
        },
      ],
      total: 50,
      page: 2,
      pageSize: 12,
    });
  });

  it("clamps the page when it exceeds the total pages", async () => {
    mockCountDocuments.mockResolvedValue(30);
    mockToArray.mockResolvedValue([]);

    const result = await listMovies({ page: 5, pageSize: 24 });

    expect(mockSkip).toHaveBeenCalledWith(24);
    expect(result.page).toBe(2);
  });

  it("sorts IMDb ratings with numeric values before invalid ratings", async () => {
    mockCountDocuments.mockResolvedValue(2);
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "band-of-brothers" },
        title: "Band of Brothers",
        year: 2001,
        imdb: { rating: 9.6 },
      },
      {
        _id: { toString: () => "zero-rating" },
        title: "Zero Rating",
        year: 2015,
        imdb: { rating: 0 },
      },
      {
        _id: { toString: () => "unrated" },
        title: "Unrated",
        year: 2015,
        imdb: { rating: "" },
      },
    ]);

    const result = await listMovies({ sort: "imdb-rating-desc" });

    expect(mockFind).not.toHaveBeenCalled();
    expect(mockAggregate).toHaveBeenCalledWith([
      { $match: POSTER_FILTER },
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
          __imdbRatingSort: -1,
          title: 1,
        },
      },
      { $skip: 0 },
      { $limit: 24 },
    ]);
    expect(result.movies.map((movie) => movie.imdb.rating)).toEqual([
      9.6, 0, 0,
    ]);
  });
});

describe("searchMoviesByTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as never);
  });

  it("falls back to listMovies for blank queries", async () => {
    mockCountDocuments.mockResolvedValue(0);
    mockToArray.mockResolvedValue([]);

    await searchMoviesByTitle("   ");

    expect(mockFind).toHaveBeenCalledWith(POSTER_FILTER);
    expect(mockSort).toHaveBeenCalledWith({ year: -1 });
  });

  it("searches by title with poster filter and selected sort", async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "def456" },
        title: "The Matrix",
        year: 1999,
        imdb: { rating: 8.7 },
      },
    ]);

    const result = await searchMoviesByTitle("matrix", { sort: "title-desc" });

    expect(mockFind).toHaveBeenCalledWith({
      poster: { $exists: true, $ne: "" },
      title: { $regex: "matrix", $options: "i" },
    });
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ title: -1 });
    expect(result.movies[0]?.title).toBe("The Matrix");
    expect(result.total).toBe(10);
  });

  it("searches by title with IMDb rating sort", async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockToArray.mockResolvedValue([]);

    await searchMoviesByTitle("matrix", { sort: "imdb-rating-desc" });

    expect(mockAggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $match: {
            poster: { $exists: true, $ne: "" },
            title: { $regex: "matrix", $options: "i" },
          },
        },
        {
          $sort: {
            __imdbRatingMissing: 1,
            __imdbRatingSort: -1,
            title: 1,
          },
        },
      ]),
    );
  });
});
