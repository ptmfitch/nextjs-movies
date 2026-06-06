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
const mockSort = vi.fn(() => ({ limit: mockLimit }));
const mockProject = vi.fn(() => ({ sort: mockSort }));
const mockFind = vi.fn(() => ({ project: mockProject }));
const mockCollection = vi.fn(() => ({ find: mockFind }));

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

  it("queries movies with poster filter, projection, and limit", async () => {
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

    const movies = await listMovies(12);

    expect(mockCollection).toHaveBeenCalledWith("movies");
    expect(mockFind).toHaveBeenCalledWith(POSTER_FILTER);
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ year: -1 });
    expect(mockLimit).toHaveBeenCalledWith(12);
    expect(movies).toEqual([
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
    mockToArray.mockResolvedValue([]);

    await searchMoviesByTitle("   ");

    expect(mockFind).toHaveBeenCalledWith(POSTER_FILTER);
    expect(mockSort).toHaveBeenCalledWith({ year: -1 });
  });

  it("searches by title with poster filter and imdb sort", async () => {
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "def456" },
        title: "The Matrix",
        year: 1999,
        imdb: { rating: 8.7 },
      },
    ]);

    const movies = await searchMoviesByTitle("matrix");

    expect(mockFind).toHaveBeenCalledWith({
      poster: { $exists: true, $ne: "" },
      title: { $regex: "matrix", $options: "i" },
    });
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ "imdb.rating": -1 });
    expect(movies[0]?.title).toBe("The Matrix");
  });
});
