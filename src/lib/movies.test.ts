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
const mockSort = vi.fn(() => ({ limit: mockLimit, skip: mockSkip }));
const mockProject = vi.fn(() => ({ sort: mockSort }));
const mockFind = vi.fn(() => ({ project: mockProject }));
const mockCountDocuments = vi.fn();
const mockCollection = vi.fn(() => ({
  find: mockFind,
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
      title: {
        $regex:
          "m[^A-Za-z0-9]*a[^A-Za-z0-9]*t[^A-Za-z0-9]*r[^A-Za-z0-9]*i[^A-Za-z0-9]*x",
        $options: "i",
      },
    });
  });

  it("allows search terms to match title separators", () => {
    const filter = buildTitleSearchFilter("starwars");
    const titleFilter = filter.title as { $regex: string; $options: string };

    expect(new RegExp(titleFilter.$regex, titleFilter.$options).test("Star Wars"))
      .toBe(true);
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
      title: {
        $regex:
          "m[^A-Za-z0-9]*a[^A-Za-z0-9]*t[^A-Za-z0-9]*r[^A-Za-z0-9]*i[^A-Za-z0-9]*x",
        $options: "i",
      },
    });
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ title: -1 });
    expect(result.movies[0]?.title).toBe("The Matrix");
    expect(result.total).toBe(10);
  });

  it("falls back to fuzzy title matching when exact search has no results", async () => {
    mockCountDocuments.mockResolvedValue(0);
    mockToArray
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          _id: { toString: () => "def456" },
          title: "The Matrix",
          year: 1999,
          imdb: { rating: 8.7 },
        },
        {
          _id: { toString: () => "ghi789" },
          title: "Titanic",
          year: 1997,
          imdb: { rating: 7.9 },
        },
      ]);

    const result = await searchMoviesByTitle("matrx", {
      pageSize: 12,
      sort: "title-asc",
    });

    expect(mockFind).toHaveBeenNthCalledWith(1, {
      poster: { $exists: true, $ne: "" },
      title: {
        $regex:
          "m[^A-Za-z0-9]*a[^A-Za-z0-9]*t[^A-Za-z0-9]*r[^A-Za-z0-9]*x",
        $options: "i",
      },
    });
    expect(mockFind).toHaveBeenNthCalledWith(2, {
      poster: { $exists: true, $ne: "" },
      $or: [
        {
          title: {
            $regex: "m[^A-Za-z0-9]*a[^A-Za-z0-9]*t",
            $options: "i",
          },
        },
        {
          title: {
            $regex: "t[^A-Za-z0-9]*r[^A-Za-z0-9]*x",
            $options: "i",
          },
        },
      ],
    });
    expect(mockSort).toHaveBeenLastCalledWith({ title: 1 });
    expect(mockLimit).toHaveBeenLastCalledWith(2000);
    expect(result.movies).toHaveLength(1);
    expect(result.movies[0]?.title).toBe("The Matrix");
    expect(result.total).toBe(1);
  });
});
