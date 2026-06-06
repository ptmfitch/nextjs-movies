import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOVIE_PROJECTION,
  POSTER_FILTER,
  buildFlexibleTitleRegex,
  buildTitleSearchFilter,
  listMovies,
  searchMoviesByTitle,
} from "@/lib/movies";
import { getDb } from "@/lib/mongodb";

const mockAggregateToArray = vi.fn();
const mockAggregate = vi.fn(() => ({ toArray: mockAggregateToArray }));
const mockToArray = vi.fn();
const mockLimit = vi.fn(() => ({ toArray: mockToArray }));
const mockSkip = vi.fn(() => ({ limit: mockLimit }));
const mockSort = vi.fn(() => ({ skip: mockSkip }));
const mockProject = vi.fn(() => ({ sort: mockSort }));
const mockFind = vi.fn(() => ({ project: mockProject }));
const mockCountDocuments = vi.fn();
const mockCollection = vi.fn(() => ({
  aggregate: mockAggregate,
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

  it("builds a case-insensitive flexible title regex filter with poster constraint", () => {
    expect(buildTitleSearchFilter("matrix")).toEqual({
      poster: { $exists: true, $ne: "" },
      title: {
        $regex: String.raw`m[\s._:;,'"!?()[\]{}&+\-/\\]*a[\s._:;,'"!?()[\]{}&+\-/\\]*t[\s._:;,'"!?()[\]{}&+\-/\\]*r[\s._:;,'"!?()[\]{}&+\-/\\]*i[\s._:;,'"!?()[\]{}&+\-/\\]*x`,
        $options: "i",
      },
    });
  });

  it("escapes regex characters in the query", () => {
    expect(buildTitleSearchFilter("C++")).toEqual({
      poster: { $exists: true, $ne: "" },
      title: {
        $regex: String.raw`C[\s._:;,'"!?()[\]{}&+\-/\\]*\+[\s._:;,'"!?()[\]{}&+\-/\\]*\+`,
        $options: "i",
      },
    });
  });

  it("allows omitted whitespace between title characters", () => {
    const pattern = new RegExp(buildFlexibleTitleRegex("starwars"), "i");

    expect(pattern.test("Star Wars")).toBe(true);
    expect(pattern.test("Star-Wars")).toBe(true);
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
    expect(mockAggregate).not.toHaveBeenCalled();
  });

  it("searches by title with Atlas Search fuzzy matching and selected sort", async () => {
    mockAggregateToArray
      .mockResolvedValueOnce([{ total: 10 }])
      .mockResolvedValueOnce([
        {
          _id: { toString: () => "def456" },
          title: "The Matrix",
          year: 1999,
          imdb: { rating: 8.7 },
        },
      ]);

    const result = await searchMoviesByTitle("matrx", { sort: "title-desc" });

    expect(mockAggregate).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        $search: expect.objectContaining({
          index: "movies_title_search",
          compound: expect.objectContaining({
            minimumShouldMatch: 1,
            should: expect.arrayContaining([
              expect.objectContaining({
                text: expect.objectContaining({
                  query: "matrx",
                  path: "title",
                  fuzzy: expect.objectContaining({ maxEdits: 1 }),
                }),
              }),
              expect.objectContaining({
                autocomplete: expect.objectContaining({
                  query: "matrx",
                  path: "title",
                }),
              }),
            ]),
          }),
        }),
      }),
      { $match: POSTER_FILTER },
      { $count: "total" },
    ]);
    expect(mockAggregate).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ $search: expect.any(Object) }),
      { $match: POSTER_FILTER },
      { $sort: { title: -1 } },
      { $skip: 0 },
      { $limit: 24 },
      { $project: MOVIE_PROJECTION },
    ]);
    expect(mockFind).not.toHaveBeenCalled();
    expect(result.movies[0]?.title).toBe("The Matrix");
    expect(result.total).toBe(10);
  });

  it("falls back to whitespace-tolerant regex when Atlas Search is unavailable", async () => {
    mockAggregateToArray.mockRejectedValue(
      new Error("$search is not available locally"),
    );
    mockCountDocuments.mockResolvedValue(1);
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "ghi789" },
        title: "Star Wars",
        year: 1977,
        imdb: { rating: 8.6 },
      },
    ]);

    const result = await searchMoviesByTitle("starwars", { sort: "title-asc" });

    expect(mockFind).toHaveBeenCalledWith({
      poster: { $exists: true, $ne: "" },
      title: {
        $regex: buildFlexibleTitleRegex("starwars"),
        $options: "i",
      },
    });
    expect(mockProject).toHaveBeenCalledWith(MOVIE_PROJECTION);
    expect(mockSort).toHaveBeenCalledWith({ title: 1 });
    expect(result.movies[0]?.title).toBe("Star Wars");
    expect(result.total).toBe(1);
  });

  it("surfaces Atlas Search failures that do not mean search is unavailable", async () => {
    mockAggregateToArray.mockRejectedValue(
      new Error(
        "Atlas Search index has an invalid autocomplete index field definition for $search",
      ),
    );

    await expect(searchMoviesByTitle("matrix")).rejects.toThrow(
      "invalid autocomplete index field definition",
    );

    expect(mockFind).not.toHaveBeenCalled();
  });

  it("falls back to whitespace-tolerant regex when Atlas Search has no matches", async () => {
    mockAggregateToArray.mockResolvedValueOnce([]);
    mockCountDocuments.mockResolvedValue(1);
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => "ghi789" },
        title: "Star Wars",
        year: 1977,
        imdb: { rating: 8.6 },
      },
    ]);

    const result = await searchMoviesByTitle("starwars");

    expect(mockFind).toHaveBeenCalledWith({
      poster: { $exists: true, $ne: "" },
      title: {
        $regex: buildFlexibleTitleRegex("starwars"),
        $options: "i",
      },
    });
    expect(result.movies[0]?.title).toBe("Star Wars");
  });
});
