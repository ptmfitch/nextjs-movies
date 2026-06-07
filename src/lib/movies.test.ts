import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOVIE_PROJECTION,
  POSTER_FILTER,
  buildTitleSearchStage,
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

describe("buildTitleSearchStage", () => {
  it("returns null for blank queries", () => {
    expect(buildTitleSearchStage("")).toBeNull();
    expect(buildTitleSearchStage("   ")).toBeNull();
  });

  it("builds a fuzzy Atlas Search stage with poster existence filtering", () => {
    expect(buildTitleSearchStage("matrix")).toEqual({
      $search: {
        index: "movies_title_search",
        compound: {
          filter: [
            {
              exists: {
                path: "poster",
              },
            },
          ],
          should: [
            {
              phrase: {
                query: "matrix",
                path: "title",
                slop: 1,
                score: { boost: { value: 12 } },
              },
            },
            {
              text: {
                query: "matrix",
                path: "title",
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 1,
                  maxExpansions: 50,
                },
                matchCriteria: "all",
                score: { boost: { value: 8 } },
              },
            },
            {
              wildcard: {
                query: "*matrix*",
                path: { value: "title", multi: "keyword" },
                allowAnalyzedField: true,
                score: { boost: { value: 4 } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    });
  });

  it("compacts separators so starwars can match Star Wars titles", () => {
    const stage = buildTitleSearchStage("star wars");

    expect(stage?.$search.compound.should).toContainEqual({
      wildcard: {
        query: "*starwars*",
        path: { value: "title", multi: "keyword" },
        allowAnalyzedField: true,
        score: { boost: { value: 4 } },
      },
    });
  });
});

describe("listMovies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAggregateToArray.mockReset();
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
    mockAggregateToArray.mockReset();
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

    const result = await searchMoviesByTitle("matrix", { sort: "title-desc" });

    const searchStage = buildTitleSearchStage("matrix");
    expect(mockAggregate).toHaveBeenNthCalledWith(1, [
      searchStage,
      { $match: POSTER_FILTER },
      { $count: "total" },
    ]);
    expect(mockAggregate).toHaveBeenNthCalledWith(2, [
      searchStage,
      { $match: POSTER_FILTER },
      { $sort: { title: -1 } },
      { $skip: 0 },
      { $limit: 24 },
      { $project: MOVIE_PROJECTION },
    ]);
    expect(result.movies[0]?.title).toBe("The Matrix");
    expect(result.total).toBe(10);
  });

  it("clamps Atlas Search pagination before fetching documents", async () => {
    mockAggregateToArray.mockResolvedValueOnce([{ total: 30 }]).mockResolvedValueOnce([]);

    const result = await searchMoviesByTitle("matrix", { page: 5, pageSize: 24 });

    expect(mockAggregate).toHaveBeenNthCalledWith(2, [
      buildTitleSearchStage("matrix"),
      { $match: POSTER_FILTER },
      { $sort: { year: -1 } },
      { $skip: 24 },
      { $limit: 24 },
      { $project: MOVIE_PROJECTION },
    ]);
    expect(result.page).toBe(2);
  });
});
